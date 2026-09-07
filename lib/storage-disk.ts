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

interface CacheData {
    [username: string]: {
        followers: number;
        lastUpdated: number;
        expiresAt: number;
        lastEndOfDaySync?: string; // YYYY-MM-DD
    }
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

export function getCachedProfile(username: string): { followers: number, lastUpdated: number, expiresAt: number, lastEndOfDaySync?: string } | null {
    const cache = getCacheData();
    return cache[username] || null;
}

export function saveCachedProfile(username: string, followers: number, isEndOfDaySync: boolean = false, ttl: number = 2 * 60 * 60 * 1000) {
    const cache = getCacheData();

    const expiresAt = Date.now() + ttl;

    const existingData = cache[username] || {};

    cache[username] = {
        followers,
        lastUpdated: Date.now(),
        expiresAt,
        lastEndOfDaySync: isEndOfDaySync ? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }) : existingData.lastEndOfDaySync
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}
