import { get, put, BlobError, BlobServiceRateLimited } from '@vercel/blob';
import type { DailyStats, CachedProfile, ProfileSnapshot } from './storage-disk';

// Keys in the blob store. These replace the on-disk paths: there is no filesystem
// here, so nothing derived from process.cwd() would mean anything.
//
// Deliberately unprefixed. A blob store belongs to one project, so each deployment
// has its own and there is nothing to namespace against. And a store shared between
// two brands would not be saved by a prefix anyway — history.json is keyed by
// username, so both would already coexist in one document, which is the situation
// issue #3 argues against rather than one to design for.
const HISTORY_KEY = 'history.json';
const CACHE_KEY = 'cache.json';

// Reads always bypass the CDN. Overwriting a blob takes up to 60s to propagate and
// get() can serve the previous version in the meantime, which would make every
// read-modify-write cycle here silently lose updates. Consistent reads are only
// available on private stores, which is why the store must be private.
const READ_OPTIONS = { access: 'private', useCache: false } as const;

const WRITE_OPTIONS = {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
} as const;

// How many times a conditional write may be retried before giving up.
const MAX_CAS_ATTEMPTS = 3;

interface HistoryData {
    [username: string]: DailyStats[];
}

interface CacheData {
    [username: string]: CachedProfile;
}

// What to do when a blob exists but its content will not parse. The two documents
// answer this differently because they are worth different amounts.
//
// 'throw' is for the history: it is the one record that cannot be rebuilt. Falling
// back to an empty document would hand saveDailyStats a null etag, so its write
// would go out unconditionally — replacing an unreadable-but-possibly-salvageable
// document with one holding only the current user, and taking every other user's
// history with it. There is no conflict for the CAS to catch, because no condition
// was sent.
//
// 'treat-as-empty' is for the cache, which is reconstructible: an unreadable cache
// is a cache miss, and a cache miss costs one scrape. Throwing there would be worse
// than the corruption, because the error path in fetchProfile re-reads the cache to
// serve a stale value — a throw would escape that catch and turn every request into
// a 500, breaking the fallback the cache exists for.
type CorruptPolicy = 'throw' | 'treat-as-empty';

// A missing blob comes back as null rather than throwing, which lines up with the
// disk backend returning {} for a file that does not exist yet. head() would throw
// instead, and has no useCache option, so it is not usable here.
async function readJson<T>(key: string, onCorrupt: CorruptPolicy): Promise<{ data: T; etag: string | null }> {
    const result = await get(key, READ_OPTIONS);

    // Absent is not an anomaly, it is the first run.
    if (!result || result.statusCode !== 200 || !result.stream) {
        return { data: {} as T, etag: null };
    }

    try {
        const data = await new Response(result.stream).json();
        return { data: data as T, etag: result.blob.etag };
    } catch (error) {
        if (onCorrupt === 'throw') {
            const detail = error instanceof Error ? error.message : String(error);
            throw new Error(`Blob ${key} exists but its content is not valid JSON, so it will not be overwritten: ${detail}`);
        }

        console.error(`Error parsing ${key} from blob store, continuing as if empty:`, error);
        return { data: {} as T, etag: null };
    }
}

async function writeJson(key: string, data: unknown, ifMatch?: string): Promise<void> {
    await put(key, JSON.stringify(data, null, 2), { ...WRITE_OPTIONS, ...(ifMatch ? { ifMatch } : {}) });
}

// A losing conditional write surfaces as one of two different classes depending on
// sub-millisecond timing: BlobPreconditionFailedError when the winner already
// landed (412), and a plain BlobError when both were in flight at once (S3's
// ConditionalRequestConflict, 409, which the SDK does not map). No SDK error
// carries a status or code field to tell them apart, so the class cannot be the
// discriminator — retry on any of them. That deliberately also retries errors that
// have nothing to do with concurrency, which is why nothing downstream should claim
// a retry proves a conflict happened.
//
// BlobServiceRateLimited is the exception: it is also a BlobError, and retrying it
// immediately makes the rate limiting worse.
function isRetriableBlobError(error: unknown): boolean {
    if (error instanceof BlobServiceRateLimited) {
        return false;
    }
    return error instanceof BlobError;
}

export async function getHistory(username: string): Promise<DailyStats[]> {
    const { data } = await readJson<HistoryData>(HISTORY_KEY, 'throw');
    return data[username] || [];
}

// Mirrors saveDailyStats in storage-disk.ts. The mutation is duplicated rather than
// shared so that the disk module can stay byte-for-byte identical to what it was.
function applyDailyStats(data: HistoryData, username: string, followers: number): DailyStats[] {
    const history = data[username] || [];
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

    const existingEntryIndex = history.findIndex(h => h.date === today);

    if (existingEntryIndex >= 0) {
        history[existingEntryIndex].followers = followers;

        if (existingEntryIndex > 0) {
            history[existingEntryIndex].change = followers - history[existingEntryIndex - 1].followers;
        } else {
            history[existingEntryIndex].change = 0;
        }

    } else {
        const lastEntry = history[history.length - 1];
        const change = lastEntry ? followers - lastEntry.followers : 0;

        history.push({
            date: today,
            followers,
            change
        });
    }

    data[username] = history;
    return history;
}

export async function saveDailyStats(username: string, followers: number): Promise<DailyStats[]> {
    let lastError: unknown;

    // Compare-and-swap. The whole document is replaced on every write, so a lost
    // update here would drop other usernames' entries too. Each attempt re-reads and
    // re-applies: followers is a parameter, so re-applying has no side effect and
    // never needs the profile to be scraped again.
    for (let attempt = 1; attempt <= MAX_CAS_ATTEMPTS; attempt++) {
        const { data, etag } = await readJson<HistoryData>(HISTORY_KEY, 'throw');
        const history = applyDailyStats(data, username, followers);

        try {
            await writeJson(HISTORY_KEY, data, etag ?? undefined);
            return history;
        } catch (error) {
            if (!isRetriableBlobError(error)) {
                throw error;
            }
            lastError = error;
            const detail = error instanceof Error ? error.message : String(error);
            console.warn(`[Blob] Conditional write of ${HISTORY_KEY} for ${username} failed on attempt ${attempt}/${MAX_CAS_ATTEMPTS}, retrying: ${detail}`);
        }
    }

    throw lastError;
}

export async function getCachedProfile(username: string): Promise<CachedProfile | null> {
    const { data } = await readJson<CacheData>(CACHE_KEY, 'treat-as-empty');
    return data[username] || null;
}

// Last-write-wins on purpose: no ifMatch, no retry. The cache is reconstructible, and
// losing a write here costs one extra scrape rather than corrupting a record.
export async function saveCachedProfile(username: string, snapshot: ProfileSnapshot, isEndOfDaySync: boolean = false, ttl: number = 2 * 60 * 60 * 1000): Promise<void> {
    const { data: cache } = await readJson<CacheData>(CACHE_KEY, 'treat-as-empty');

    const expiresAt = Date.now() + ttl;

    const existingData = cache[username] || ({} as CachedProfile);

    cache[username] = {
        followers: snapshot.followers,
        // Mirrors storage-disk: a backoff write only carries the follower count,
        // so the name and picture are preserved rather than blanked.
        following: snapshot.following ?? existingData.following,
        fullName: snapshot.fullName ?? existingData.fullName,
        profilePicUrl: snapshot.profilePicUrl ?? existingData.profilePicUrl,
        lastUpdated: Date.now(),
        expiresAt,
        lastEndOfDaySync: isEndOfDaySync ? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' }) : existingData.lastEndOfDaySync
    };

    await writeJson(CACHE_KEY, cache);
}
