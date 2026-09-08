import type { NextRequest } from 'next/server';
import { refreshAndRecord } from '@/lib/refresh';

export const dynamic = 'force-dynamic';

/**
 * Keeps the history complete without anyone having to open the page.
 *
 * Two things used to depend on a visitor showing up: the ordinary refresh, which
 * only happens when the 2h cache expires AND a request arrives, and the end-of-day
 * sync, whose window is the ten minutes between 23:50 and 23:59 Venezuela time. If
 * nobody loaded the dashboard in those ten minutes, the number the day closed on
 * was never recorded — and a gap in a cumulative history does not heal.
 *
 * ⚠️ Two things about the schedule, both learned the hard way.
 *
 * Vercel registers ONE cron per path. Two entries in vercel.json pointing at the
 * same route do not both run — `vercel crons ls` reports them as a permanently
 * "modified" single job, and the second one silently never fires. So this is one
 * schedule that has to cover both jobs.
 *
 * And crons run in UTC. Venezuela is UTC-4, so the end-of-day window (23:50-23:59
 * local) is 03:50-03:59 UTC. The schedule fires at :55 past every odd hour, which
 * is twelve runs a day AND puts one at 03:55 UTC = 23:55 local, inside the window.
 * Writing it as 23:55 would fire at 19:55 local and miss it entirely, in silence.
 */
export async function GET(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;

    // Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when the
    // variable exists on the project. Without it configured the route stays open,
    // which is survivable here — the account is fixed and the cache TTL caps the
    // spend — but it is one line to close, so it gets closed.
    if (cronSecret) {
        if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
            return new Response('Unauthorized', { status: 401 });
        }
    } else {
        console.warn('[cron] CRON_SECRET is not set — this endpoint is unauthenticated.');
    }

    const schedule = request.headers.get('x-vercel-cron-schedule') ?? 'manual';

    try {
        const snapshot = await refreshAndRecord();

        if (!snapshot) {
            console.error(`[cron] Refresh produced no data (schedule: ${schedule}).`);
            return Response.json({ ok: false, reason: 'no-data' }, { status: 503 });
        }

        const today = snapshot.history[snapshot.history.length - 1];
        console.log(
            `[cron] ${schedule} -> ${snapshot.profile.username}: ` +
            `${snapshot.profile.followers} followers (${today?.date}, ${today?.change >= 0 ? '+' : ''}${today?.change}).`,
        );

        return Response.json({
            ok: true,
            schedule,
            followers: snapshot.profile.followers,
            date: today?.date,
            change: today?.change,
        });
    } catch (error) {
        console.error(`[cron] Refresh failed (schedule: ${schedule}):`, error);
        return Response.json({ ok: false, reason: 'error' }, { status: 500 });
    }
}
