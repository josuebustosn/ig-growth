import { getInstagramProfile } from './instagram-service';
import { saveDailyStats, getCachedProfile } from './storage';
import { brand } from './brand';
import type { DailyStats } from './storage';

export interface Snapshot {
    profile: { username: string; followers: number };
    history: DailyStats[];
    lastUpdated: number;
}

/**
 * Fetch the configured account and record today's entry.
 *
 * Shared by the dashboard's API route and the cron, so both take exactly the same
 * path: the cron is not a second implementation that can drift from the one users
 * hit. Whether this actually costs a scrape is decided downstream by the cache TTL
 * and the end-of-day window — calling it more often is cheap, not free.
 *
 * Returns null when there is no data at all: the scrape failed and no cached value
 * existed to fall back on.
 */
export async function refreshAndRecord(): Promise<Snapshot | null> {
    const username = brand.username;

    const profile = await getInstagramProfile(username);
    if (!profile) return null;

    const history = await saveDailyStats(username, profile.followers);
    const cached = await getCachedProfile(username);

    return {
        profile: { username: profile.username, followers: profile.followers },
        history,
        lastUpdated: cached?.lastUpdated ?? Date.now(),
    };
}
