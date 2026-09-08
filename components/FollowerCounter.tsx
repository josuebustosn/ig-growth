'use client';

import { useEffect, useState, useRef } from 'react';
import { formatCount } from '@/lib/format';

interface FollowerCounterProps {
    followers: number;
    username: string;
    fullName?: string;
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
        setCurrent(start); // Avoid flash of 0
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
    const hours = Math.floor(seconds / 3600);
    if (seconds < 86400) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    const days = Math.floor(seconds / 86400);
    return `hace ${days} ${days === 1 ? 'día' : 'días'}`;
}

/**
 * Instagram's CDN URLs expire and their host rotates, so this deliberately uses a
 * plain <img> instead of next/image: no remotePatterns to chase, and a broken URL
 * degrades to the initial instead of a broken-image icon.
 */
function Avatar({ src, alt, size = 52 }: { src: string; alt: string; size?: number }) {
    const [failed, setFailed] = useState(false);
    const showImage = Boolean(src) && !failed;

    return (
        <span
            aria-hidden={!showImage}
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                overflow: 'hidden',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                boxShadow: '0 0 0 2px var(--card-border)',
                color: 'var(--brand-light)',
                fontWeight: 700,
                fontSize: size * 0.4,
                lineHeight: 1,
            }}
        >
            {showImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt={alt}
                    width={size}
                    height={size}
                    referrerPolicy="no-referrer"
                    onError={() => setFailed(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            ) : (
                alt.replace(/^@/, '').charAt(0).toUpperCase()
            )}
        </span>
    );
}

export default function FollowerCounter({
    followers,
    username,
    fullName,
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

    if (loading || (followers > 0 && animatedFollowers === 0)) {
        const shimmerStyle = {
            background: 'linear-gradient(90deg, var(--card-bg) 25%, var(--card-border) 50%, var(--card-bg) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
        };
        return (
            <div className="glass-panel follower-counter-box" style={{
                padding: '3rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
            }}>
                <div style={{ ...shimmerStyle, width: '280px', height: '5rem', borderRadius: '12px' }} />
                <div style={{ ...shimmerStyle, width: '160px', height: '1.8rem', borderRadius: '6px' }} />
                <div style={{ ...shimmerStyle, width: '140px', height: '1.2rem', borderRadius: '6px', marginTop: '0.5rem' }} />
            </div>
        );
    }

    return (
        <div className="glass-panel follower-counter-box" style={{
            padding: '3rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem'
        }}>
            <a
                href={`https://instagram.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="fade-in"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.7rem',
                    marginBottom: '0.4rem',
                    color: 'var(--text-muted)',
                }}
            >
                <Avatar src={profilePicUrl} alt={fullName || username} />
                <span style={{ textAlign: 'left', lineHeight: 1.25 }}>
                    {fullName && fullName !== username && (
                        <strong style={{ display: 'block', color: 'var(--foreground)', fontSize: '0.95rem' }}>
                            {fullName}
                        </strong>
                    )}
                    <span style={{ fontSize: '0.85rem' }}>@{username}</span>
                </span>
            </a>
            <h1 className="text-gradient fade-in tabular" style={{ fontSize: '5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {formatCount(animatedFollowers)}
            </h1>
            <p className="fade-in" style={{ color: 'var(--text-muted)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Seguidores
                {todayChange !== 0 && (
                    <span style={{
                        fontSize: '0.9rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                        background: todayChange > 0
                            ? 'color-mix(in srgb, var(--success) 18%, transparent)'
                            : 'color-mix(in srgb, var(--danger) 18%, transparent)',
                        color: todayChange > 0 ? 'var(--success)' : 'var(--danger)',
                        fontWeight: 600
                    }}>
                        {todayChange > 0 ? '+' : ''}{todayChange} hoy
                    </span>
                )}
            </p>
            {timeAgo && (
                <p className="fade-in" style={{
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
