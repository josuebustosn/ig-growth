import { NextResponse } from 'next/server';
import { getInstagramProfile } from '@/lib/instagram-service';
import { saveDailyStats } from '@/lib/storage';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
        return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const profile = await getInstagramProfile(username);

    if (!profile) {
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // Save stats and get updated history
    const history = saveDailyStats(username, profile.followers);

    return NextResponse.json({
        profile,
        history
    });
}
