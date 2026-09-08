import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const CACHE_FILE = path.join(DATA_DIR, 'cache.json');

export interface DailyStats {
    date: string; // YYYY-MM-DD
    followers: number;
    change: number;
}

interface HistoryData {
    [username: string]: DailyStats[];
}

/**
 * What we keep about a profile between scrapes.
 *
 * Everything past `followers` is optional because entries written before these
 * fields existed are still valid cache: an old document must not become a cache
 * miss (that costs a paid scrape) just because it lacks a display name.
 */
export interface CachedProfile {
    followers: number;
    following?: number;
    fullName?: string;
    profilePicUrl?: string;
    lastUpdated: number;
    expiresAt: number;
    lastEndOfDaySync?: string; // YYYY-MM-DD
}

/** The fields a scrape contributes; the timestamps are added on write. */
export interface ProfileSnapshot {
    followers: number;
    following?: number;
    fullName?: string;
    profilePicUrl?: string;
}

interface CacheData {
    [username: string]: CachedProfile;
}

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function readHistory(): HistoryData {
    ensureDataDir();
    if (!fs.existsSync(HISTORY_FILE)) {
        return {};
    }
    try {
        const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading history file:', error);
        return {};
    }
}

function writeHistory(data: HistoryData) {
    ensureDataDir();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function getHistory(username: string): DailyStats[] {
    const data = readHistory();
    return data[username] || [];
}

export function saveDailyStats(username: string, followers: number): DailyStats[] {
    const data = readHistory();
    const history = data[username] || [];
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

    const existingEntryIndex = history.findIndex(h => h.date === today);

    if (existingEntryIndex >= 0) {
        // Update today's entry
        history[existingEntryIndex].followers = followers;

        if (existingEntryIndex > 0) {
            history[existingEntryIndex].change = followers - history[existingEntryIndex - 1].followers;
        } else {
            history[existingEntryIndex].change = 0;
        }

    } else {
        // New entry for today
        const lastEntry = history[history.length - 1];
        const change = lastEntry ? followers - lastEntry.followers : 0;

        history.push({
            date: today,
            followers,
            change
        });
    }

    data[username] = history;
    writeHistory(data);
    return history;
}

// Cache Logic

function getCacheData(): CacheData {
    ensureDataDir();
    if (!fs.existsSync(CACHE_FILE)) {
        return {};
    }
    try {
        const fileContent = fs.readFileSync(CACHE_FILE, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        return {};
    }
}

export function getCachedProfile(username: string): CachedProfile | null {
    const cache = getCacheData();
    return cache[username] || null;
}

export function saveCachedProfile(username: string, snapshot: ProfileSnapshot, isEndOfDaySync: boolean = false, ttl: number = 2 * 60 * 60 * 1000) {
    ensureDataDir();
    const cache = getCacheData();

    const expiresAt = Date.now() + ttl;

    const existingData = cache[username] || ({} as CachedProfile);

    cache[username] = {
        followers: snapshot.followers,
        // The error path re-saves a stale entry to back off, and it only knows the
        // follower count. Keeping the previous name and picture means a backoff
        // does not blank out the header.
        following: snapshot.following ?? existingData.following,
        fullName: snapshot.fullName ?? existingData.fullName,
        profilePicUrl: snapshot.profilePicUrl ?? existingData.profilePicUrl,
        lastUpdated: Date.now(),
        expiresAt,
        lastEndOfDaySync: isEndOfDaySync ? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }) : existingData.lastEndOfDaySync
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}
