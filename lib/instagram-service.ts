import { ApifyClient } from 'apify-client';
import { getCachedProfile, saveCachedProfile } from './storage';
import type { CachedProfile } from './storage';

// Apify Actor: instagram-scraper
const APIFY_ACTOR_ID = '7RQ4RlfRihUhflQtJ';

// How long to wait for the Apify run before giving up. Serverless platforms cap
// how long a function may run, and that cap varies per plan, so this is read from
// APIFY_WAIT_SECS and each deployment tunes it to fit its own limit.
const DEFAULT_APIFY_WAIT_SECS = 50;

// Shape of the fields we read off the Actor's dataset items. Verified against a
// real run: a found profile carries profilePic, userName, followersCount,
// followsCount, userFullName, userUrl and userId; a missing or private one comes
// back as { url, username, error, errorDescription } instead — same HTTP 200,
// same SUCCEEDED run, so the error field is the only thing that distinguishes it.
type ApifyProfileItem = {
    followersCount?: unknown;
    followers?: unknown;
    followsCount?: unknown;
    userFullName?: unknown;
    profilePic?: unknown;
    error?: unknown;
    errorDescription?: unknown;
};

// The Actor reports a bad handle in-band rather than by failing the run. Without
// this the caller only saw "could not find followers count", which reads like a
// shape change in the response when it actually means the account is not there.
function assertNoActorError(item: ApifyProfileItem, username: string): void {
    if (!item.error) return;
    const detail = typeof item.errorDescription === 'string' && item.errorDescription
        ? item.errorDescription
        : String(item.error);
    throw new Error(`Apify could not read @${username}: ${detail}`);
}

function asText(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function asCount(value: unknown): number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

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

/** Everything the Actor gives us that is worth keeping. */
interface ScrapedProfile {
    followers: number;
    following: number;
    fullName: string;
    profilePicUrl: string;
}

async function fetchProfileFromApify(username: string): Promise<ScrapedProfile> {
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
    assertNoActorError(userData, username);

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

    // These three were already being paid for on every run and thrown away: the
    // service returned a hardcoded empty picture, a zero following count and the
    // handle as the display name. They cost nothing extra to keep.
    return {
        followers,
        following: asCount(userData.followsCount),
        fullName: asText(userData.userFullName) || username,
        profilePicUrl: asText(userData.profilePic),
    };
}

// A cached entry written before the profile fields existed still serves: the
// counter is what the dashboard is for, the name and picture are decoration.
function toProfile(username: string, cached: CachedProfile): InstagramProfile {
    return {
        username,
        fullName: cached.fullName || username,
        followers: cached.followers,
        following: cached.following ?? 0,
        profilePicUrl: cached.profilePicUrl || '',
        biography: '',
    };
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
            return toProfile(username, cached);
        }

        // 2. Fetch from Apify
        // Reject malformed usernames before spending an Actor run on them.
        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!usernameRegex.test(username)) {
            throw new Error(`Invalid username format: ${username}`);
        }

        console.log(`Fetching fresh data for ${username} via Apify...`);
        const scraped = await fetchProfileFromApify(username);

        // 3. Update Cache
        await saveCachedProfile(username, scraped, isEndOfDaySync);

        return { username, biography: '', ...scraped };

    } catch (error) {
        // The hosting platform collects stderr. Writing our own file does not work
        // on a read-only serverless filesystem and only produced a second error.
        console.error(`[instagram] Fetch failed for ${username}:`, error);

        // Fallback to cache if available even if expired, and update timestamp to prevent Loop
        const cached = await getCachedProfile(username);
        if (cached) {
            console.log(`[Error Recovery] Using old cache for ${username} and backing off for 15 mins.`);
            // Update cache with backoff (15 mins) to prevent immediate retry loop
            await saveCachedProfile(username, { followers: cached.followers }, false, 15 * 60 * 1000);

            return toProfile(username, cached);
        }

        return null;
    }
}
