'use client';

import { useEffect, useState, useRef } from 'react';

interface FollowerCounterProps {
    followers: number;
    username: string;
    profilePicUrl: string;
    loading?: boolean;
    todayChange?: number;
    lastUpdated?: number;
}

// Animated number counter hook
function useAnimatedNumber(target: number, duration: number = 1000) {
    const [current, setCurrent] = useState(0);
    const previousTarget = useRef(0);

    useEffect(() => {
        if (target === 0) return;

        const start = previousTarget.current || Math.max(0, target - 100);
        const difference = target - start;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const value = Math.floor(start + difference * easeOutQuart);

            setCurrent(value);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                previousTarget.current = target;
            }
        };

        requestAnimationFrame(animate);
    }, [target, duration]);

    return current;
}

// Format time ago
function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'hace menos de 1 min';
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`;
    return `hace ${Math.floor(seconds / 86400)} días`;
}

export default function FollowerCounter({
    followers,
    username,
    profilePicUrl,
    loading = false,
    todayChange = 0,
    lastUpdated
}: FollowerCounterProps) {
    const animatedFollowers = useAnimatedNumber(followers, 1200);
    const [timeAgo, setTimeAgo] = useState('');

    // Update time ago every 10 seconds for more accuracy
    useEffect(() => {
        if (!lastUpdated) {
            setTimeAgo('');
            return;
        }

        const updateTimeAgo = () => setTimeAgo(formatTimeAgo(lastUpdated));
        updateTimeAgo(); // Update immediately

        const interval = setInterval(updateTimeAgo, 10000); // Update every 10 seconds
        return () => clearInterval(interval);
    }, [lastUpdated]);

    if (loading) {
        return (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                {/* Skeleton loader */}
                <div style={{
                    width: '200px',
                    height: '80px',
                    background: 'linear-gradient(90deg, var(--card-bg) 25%, var(--card-border) 50%, var(--card-bg) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    borderRadius: '12px',
                    margin: '0 auto 1rem'
                }} />
                <div style={{
                    width: '100px',
                    height: '24px',
                    background: 'linear-gradient(90deg, var(--card-bg) 25%, var(--card-border) 50%, var(--card-bg) 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    borderRadius: '6px',
                    margin: '0 auto'
                }} />
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{
            padding: '3rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem'
        }}>
            <h1 className="text-gradient" style={{ fontSize: '5rem', fontWeight: '800', lineHeight: 1 }}>
                {animatedFollowers.toLocaleString('es-ES')}
            </h1>
            <p style={{ color: 'var(--success)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Seguidores
                {todayChange !== 0 && (
                    <span style={{
                        fontSize: '0.9rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                        background: todayChange > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: todayChange > 0 ? 'var(--success)' : 'var(--danger)',
                        fontWeight: '600'
                    }}>
                        {todayChange > 0 ? '+' : ''}{todayChange} hoy
                    </span>
                )}
            </p>
            {timeAgo && (
                <p style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.5rem'
                }}>
                    Actualizado {timeAgo}
                </p>
            )}
        </div>
    );
}
