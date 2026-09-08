import { NextResponse } from 'next/server';
import { getInstagramProfile } from '@/lib/instagram-service';
import { saveDailyStats, getCachedProfile } from '@/lib/storage';
import { brand } from '@/lib/brand';

// This route writes to the history and can trigger a paid scrape, so it must not
// be prerendered or cached as a static response.
export const dynamic = 'force-dynamic';

/**
 * The account is fixed by configuration and the query string is ignored.
 *
 * It used to come from `?username=`, which meant anyone who found the URL could
 * make this deployment scrape any Instagram account they liked. Two things were
 * wrong with that: every scrape is billed to our Apify credit, and each new
 * account was appended permanently to history.json — one shared document that
 * nobody would ever clean up. Neither rate limiting nor an allow-list is needed
 * once the client stops choosing.
 */
export async function GET() {
    const username = brand.username;

    try {
        const profile = await getInstagramProfile(username);

        if (!profile) {
            // No cache to fall back on and the scrape failed. Deliberately vague:
            // the reason is in the server logs, not in the response.
            return NextResponse.json(
                { error: 'No hay datos disponibles en este momento.' },
                { status: 503, headers: { 'Cache-Control': 'no-store' } },
            );
        }

        const history = await saveDailyStats(username, profile.followers);
        const cached = await getCachedProfile(username);

        return NextResponse.json(
            {
                profile,
                history,
                lastUpdated: cached?.lastUpdated || Date.now(),
            },
            { headers: { 'Cache-Control': 'no-store' } },
        );
    } catch (error) {
        // saveDailyStats throws when the history document exists but will not
        // parse — refusing to overwrite a record it cannot read. Everything else
        // is already handled upstream, so reaching here means something the
        // caller cannot act on: log it in full, tell them nothing.
        console.error(`[api/followers] Unhandled failure for ${username}:`, error);
        return NextResponse.json(
            { error: 'No hay datos disponibles en este momento.' },
            { status: 503, headers: { 'Cache-Control': 'no-store' } },
        );
    }
}
