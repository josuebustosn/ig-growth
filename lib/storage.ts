import * as disk from './storage-disk';
import type { DailyStats } from './storage-disk';

export type { DailyStats };

// Two backends, picked by whether a blob token is present. Without one the disk
// backend runs exactly as it always has — storage-disk.ts is the previous
// storage.ts, moved without a line changed. With one, nothing touches the
// filesystem, which is what makes the app deployable on a serverless platform.
//
// Checked per call rather than once at module load, so the decision does not depend
// on the order in which the environment happens to be populated.
function useBlob(): boolean {
    return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// Loaded on demand so that a deployment running on disk never pulls @vercel/blob
// into the process at all. Every function here is already async, so the dynamic
// import costs nothing beyond the first call.
let blobModule: typeof import('./storage-blob') | null = null;

async function blob(): Promise<typeof import('./storage-blob')> {
    if (!blobModule) {
        blobModule = await import('./storage-blob');
    }
    return blobModule;
}

export async function getHistory(username: string): Promise<DailyStats[]> {
    return useBlob() ? (await blob()).getHistory(username) : disk.getHistory(username);
}

export async function saveDailyStats(username: string, followers: number): Promise<DailyStats[]> {
    return useBlob() ? (await blob()).saveDailyStats(username, followers) : disk.saveDailyStats(username, followers);
}

export async function getCachedProfile(username: string): Promise<{ followers: number, lastUpdated: number, expiresAt: number, lastEndOfDaySync?: string } | null> {
    return useBlob() ? (await blob()).getCachedProfile(username) : disk.getCachedProfile(username);
}

export async function saveCachedProfile(username: string, followers: number, isEndOfDaySync: boolean = false, ttl: number = 2 * 60 * 60 * 1000): Promise<void> {
    if (useBlob()) {
        await (await blob()).saveCachedProfile(username, followers, isEndOfDaySync, ttl);
        return;
    }
    disk.saveCachedProfile(username, followers, isEndOfDaySync, ttl);
}
