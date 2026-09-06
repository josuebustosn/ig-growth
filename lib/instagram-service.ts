import { ApifyClient } from 'apify-client';
import path from 'path';
import { getCachedProfile, saveCachedProfile } from './storage';
import fs from 'fs';

// Apify Actor: instagram-scraper
const APIFY_ACTOR_ID = '7RQ4RlfRihUhflQtJ';

// How long to wait for the Apify run before giving up. Serverless platforms cap
// how long a function may run, and that cap varies per plan, so this is read from
// APIFY_WAIT_SECS and each deployment tunes it to fit its own limit.
const DEFAULT_APIFY_WAIT_SECS = 50;

// Shape of the fields we read off the Actor's dataset items.
type ApifyProfileItem = {
    followersCount?: unknown;
    followers?: unknown;
};

// Renders a rejected value for the error message. JSON.stringify() alone is not
// enough: it prints NaN and Infinity as `null`, which hides what actually arrived.
function describeValue(value: unknown): string {
    if (typeof value === 'number') {
        return `number ${value}`;
    }
    if (typeof value === 'string') {
        return `string ${JSON.stringify(value)}`;
    }
    if (value === null) {
        return 'null';
    }
    try {
        return `${typeof value} ${JSON.stringify(value)}`;
    } catch {
        return typeof value;
    }
}

export interface InstagramProfile {
    username: string;
    fullName: string;
    followers: number;
    following: number;
    profilePicUrl: string;
    biography: string;
}

function getApifyWaitSecs(): number {
    const raw = process.env.APIFY_WAIT_SECS;
    if (!raw) {
        return DEFAULT_APIFY_WAIT_SECS;
    }

    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed <= 0) {
        console.warn(`Invalid APIFY_WAIT_SECS: "${raw}". Falling back to ${DEFAULT_APIFY_WAIT_SECS}s.`);
        return DEFAULT_APIFY_WAIT_SECS;
    }

    return parsed;
}

async function fetchFollowersFromApify(username: string): Promise<number> {
    const token = process.env.APIFY_TOKEN;
    if (!token) {
        throw new Error('APIFY_TOKEN environment variable not set.');
    }

    const client = new ApifyClient({ token });

    // log: null matters as much as waitSecs. Left undefined, apify-client opens a
    // live log stream for the run and .call() resolves through
    // `.finally(async () => streamedLog.stop())`, which only unblocks when the next
    // log chunk arrives — so a still-running, momentarily silent Actor keeps the
    // call pending well past waitSecs. That would let the host kill the function
    // before the catch below can fall back to cache. null opts out of the stream.
    const run = await client.actor(APIFY_ACTOR_ID).call(
        { usernames: [username] },
        { waitSecs: getApifyWaitSecs(), log: null }
    );

    // A run that failed, was aborted or timed out still resolves here — it just
    // leaves an empty dataset behind — so the status has to be checked explicitly.
    if (run.status !== 'SUCCEEDED') {
        throw new Error(`Apify run ${run.id} did not succeed for ${username}. Status: ${run.status}`);
    }

    const { items } = await client.dataset<ApifyProfileItem>(run.defaultDatasetId).listItems();

    if (items.length === 0) {
        throw new Error(`No data returned for user ${username}`);
    }

    const userData = items[0];
    // Fallback to 'followers' in case the Actor changes its output shape.
    const rawFollowers = userData.followersCount ?? userData.followers;

    if (rawFollowers === undefined || rawFollowers === null) {
        throw new Error(`Could not find followers count in response. Keys: ${Object.keys(userData).join(', ')}`);
    }

    // Allow-list, not a permissive cast. Number() turns "", " ", false and []
    // into 0, and Number.isFinite(0) is true, so every one of those would pass
    // as a valid count of zero. The history is cumulative: a false 0 is written
    // permanently and then poisons the next day's change and the EMA projection.
    // Failing loudly is recoverable; a wrong number on record is not.
    if (typeof rawFollowers !== 'number' && typeof rawFollowers !== 'string') {
        throw new Error(
            `Invalid followers count for ${username}: expected number or string, got ${describeValue(rawFollowers)}`
        );
    }

    // A blank string is the one string Number() would still silently read as 0.
    if (typeof rawFollowers === 'string' && rawFollowers.trim() === '') {
        throw new Error(
            `Invalid followers count for ${username}: got an empty or blank string ${JSON.stringify(rawFollowers)}`
        );
    }

    const followers = Number(rawFollowers);

    if (!Number.isInteger(followers) || followers < 0) {
        throw new Error(
            `Invalid followers count for ${username}: expected a non-negative integer, got ${describeValue(rawFollowers)}`
        );
    }

    return followers;
}

const activeRequests = new Map<string, Promise<InstagramProfile | null>>();

export async function getInstagramProfile(username: string): Promise<InstagramProfile | null> {
    // Deduplication: If a request is already in progress for this user, return it
    if (activeRequests.has(username)) {
        console.log(`[Deduplication] Reusing active request for ${username}`);
        return activeRequests.get(username)!;
    }

    const promise = (async () => {
        try {
            return await fetchProfile(username);
        } finally {
            activeRequests.delete(username);
        }
    })();

    activeRequests.set(username, promise);
    return promise;
}

async function fetchProfile(username: string): Promise<InstagramProfile | null> {
    try {
        // 1. Check Cache & End of Day Logic
        const cached = await getCachedProfile(username);
        let forceUpdate = false;
        let isEndOfDaySync = false;

        // Get current time in Venezuela
        const now = new Date();
        const venezuelaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Caracas' }));
        const hours = venezuelaTime.getHours();
        const minutes = venezuelaTime.getMinutes();
        const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

        // Debug Log (Temporary, to verify it works)
        console.log(`[Time Check] VZLA: ${hours}:${minutes.toString().padStart(2, '0')} | Window Active: ${hours === 23 && minutes >= 50}`);

        // Check if we are in the "End of Day" window (23:50 - 23:59)
        if (hours === 23 && minutes >= 50) {
            // Check if we already synced today
            if (cached?.lastEndOfDaySync !== todayStr) {
                console.log(`[End of Day] Force updating for ${todayStr} (Time: ${hours}:${minutes})`);
                forceUpdate = true;
                isEndOfDaySync = true;
            }
        }

        if (!forceUpdate && cached && (Date.now() < cached.expiresAt)) {
            console.log(`Using cached data for ${username} (Expires at: ${new Date(cached.expiresAt).toLocaleTimeString()})`);
            return {
                username,
                fullName: username,
                followers: cached.followers,
                following: 0,
                profilePicUrl: '',
                biography: ''
            };
        }

        // 2. Fetch from Apify
        // Reject malformed usernames before spending an Actor run on them.
        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!usernameRegex.test(username)) {
            throw new Error(`Invalid username format: ${username}`);
        }

        console.log(`Fetching fresh data for ${username} via Apify...`);
        const followers = await fetchFollowersFromApify(username);

        // 3. Update Cache
        await saveCachedProfile(username, followers, isEndOfDaySync);

        return {
            username,
            fullName: username,
            followers,
            following: 0,
            profilePicUrl: '',
            biography: ''
        };

    } catch (error) {
        console.error('Error fetching Instagram profile:', error);

        // Log error to file for debugging
        try {
            const logPath = path.join(process.cwd(), 'debug_error.log');
            const timestamp = new Date().toISOString();
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Include stack trace if available
            const stack = error instanceof Error ? error.stack : '';
            const logEntry = `[${timestamp}] Error for ${username}: ${errorMessage}\nStack: ${stack}\n-------------------\n`;
            fs.appendFileSync(logPath, logEntry);
        } catch (e) {
            console.error('Failed to write to log file:', e);
        }

        // Fallback to cache if available even if expired, and update timestamp to prevent Loop
        const cached = await getCachedProfile(username);
        if (cached) {
            console.log(`[Error Recovery] Using old cache for ${username} and backing off for 15 mins.`);
            // Update cache with backoff (15 mins) to prevent immediate retry loop
            await saveCachedProfile(username, cached.followers, false, 15 * 60 * 1000);

            return {
                username,
                fullName: username,
                followers: cached.followers,
                following: 0,
                profilePicUrl: '',
                biography: ''
            };
        }

        return null;
    }
}
