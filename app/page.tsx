'use client';

import { useState, useEffect } from 'react';
import FollowerCounter from '@/components/FollowerCounter';
import GrowthCalendar from '@/components/GrowthCalendar';
import Calculators from '@/components/Calculators';
import ProjectionChart from '@/components/ProjectionChart';
import ThemeToggle from '@/components/ThemeToggle';
import MusicPlayer from '@/components/MusicPlayer';
import ShareMetrics from '@/components/ShareMetrics';

import Image from 'next/image';

interface DashboardData {
  profile: {
    followers: number;
    profilePicUrl?: string;
  };
  history: { date: string; followers: number; change: number }[];
  lastUpdated?: number;
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  const username = process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME || 'trawi.viajes';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/followers?username=${username}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
        setLastFetch(Date.now());
        setError('');
      } catch (err) {
        console.error(err);
        setError('Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every 60s
    return () => clearInterval(interval);
  }, []);

  // Calculate today's change from history
  const getTodayChange = (): number => {
    if (!data?.history || data.history.length === 0) return 0;
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
    const todayEntry = data.history.find(h => h.date === today);
    return todayEntry?.change || 0;
  };

  return (
    <main className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
        <a
          href={`https://instagram.com/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}
        >
          <Image
            src="/trawi-logo.jpg"
            alt="Trawi Logo"
            width={50}
            height={50}
            style={{ borderRadius: '8px', transition: 'transform 0.2s ease' }}
            className="logo-hover"
          />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>TrawiStats 1.3</h1>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a
            href="/changelog"
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              transition: 'all 0.2s ease'
            }}
          >
            🎉 Cambios
          </a>
          <ThemeToggle />
        </div>
      </header>

      <div className="grid" style={{ gap: '2rem' }}>
        {/* Top Section: Counter and Calendar */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <FollowerCounter
            username={username}
            followers={data?.profile?.followers || 0}
            profilePicUrl={data?.profile?.profilePicUrl || ''}
            loading={loading && !data}
            todayChange={getTodayChange()}
            lastUpdated={lastFetch || undefined}
          />
          <GrowthCalendar history={data?.history || []} />
        </div>

        {/* Bottom Section: Calculators */}
        <section>
          <Calculators
            currentFollowers={data?.profile?.followers || 0}
            history={data?.history || []}
          />
        </section>

        {/* Projection Chart */}
        <section>
          <ProjectionChart
            currentFollowers={data?.profile?.followers || 0}
            history={data?.history || []}
          />
        </section>

        {/* Share Metrics */}
        <section>
          <ShareMetrics
            currentFollowers={data?.profile?.followers || 0}
            history={data?.history || []}
            username={username}
          />
        </section>
      </div>

      {/* Music Easter Egg */}
      <MusicPlayer />
    </main>
  );
}
