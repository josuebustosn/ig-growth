import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { getCachedProfile, saveCachedProfile } from './storage';
import fs from 'fs';

const execAsync = promisify(exec);

export interface InstagramProfile {
    username: string;
    fullName: string;
    followers: number;
    following: number;
    profilePicUrl: string;
    biography: string;
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
        const cached = getCachedProfile(username);
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

        // 2. Run Python Script
        // SECURITY: Validate username to prevent Command Injection
        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!usernameRegex.test(username)) {
            throw new Error(`Invalid username format: ${username}`);
        }

        console.log(`Fetching fresh data for ${username} via Apify...`);
        const scriptPath = path.join(process.cwd(), 'scripts', 'get_followers.py');
        // Use 'python' on Windows, 'python3' on Linux/Mac
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const { stdout, stderr } = await execAsync(`${pythonCmd} "${scriptPath}" "${username}"`, { env: process.env });

        if (stderr) {
            console.error('Script stderr:', stderr);
        }

        const followers = parseInt(stdout.trim(), 10);

        if (isNaN(followers)) {
            throw new Error(`Invalid output from Python script. Stdout: "${stdout.trim()}" Stderr: "${stderr.trim()}"`);
        }

        // 3. Update Cache
        saveCachedProfile(username, followers, isEndOfDaySync);

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
        const cached = getCachedProfile(username);
        if (cached) {
            console.log(`[Error Recovery] Using old cache for ${username} and backing off for 15 mins.`);
            // Update cache with backoff (15 mins) to prevent immediate retry loop
            saveCachedProfile(username, cached.followers, false, 15 * 60 * 1000);

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
