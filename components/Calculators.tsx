'use client';

import { useState, useEffect, useRef } from 'react';

interface DailyStats {
    date: string;
    followers: number;
    change: number;
}

function AnimatedCost({ value }: { value: number }) {
    const [display, setDisplay] = useState(value);
    const prevRef = useRef(value);

    useEffect(() => {
        const from = prevRef.current;
        const to = value;
        if (from === to) return;

        const duration = 400;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(from + (to - from) * eased);
            if (progress < 1) requestAnimationFrame(animate);
            else prevRef.current = to;
        };

        requestAnimationFrame(animate);
    }, [value]);

    return <>{display.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</>;
}

export default function Calculators({ currentFollowers, history, loading = false }: { currentFollowers: number, history: DailyStats[], loading?: boolean }) {
    const [cpf, setCpf] = useState<string>('0.12');

    // Milestones dinámicos
    const milestones = [10000, 20000, 50000, 100000, 500000, 1000000];

    const calculateCost = (target: number): number | null => {
        if (target <= currentFollowers) return null; // Milestone completado
        const needed = target - currentFollowers;
        return needed * parseFloat(cpf || '0');
    };

    const formatMilestone = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
        return num.toLocaleString('es-ES');
    };

    if (loading) {
        const shimmerStyle = {
            background: 'linear-gradient(90deg, var(--card-bg) 25%, var(--card-border) 50%, var(--card-bg) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '8px'
        };
        return (
            <div className="glass-panel" style={{ padding: '2rem', height: '100%' }}>
                <div style={{ ...shimmerStyle, width: '250px', height: '28px', marginBottom: '1rem' }} />
                <div style={{ ...shimmerStyle, width: '180px', height: '16px', marginBottom: '0.5rem' }} />
                <div style={{ ...shimmerStyle, width: '100%', height: '44px', marginBottom: '1.5rem' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} style={{ ...shimmerStyle, height: '46px' }} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%' }}>
            {/* CPF Projection */}
            <div className="glass-panel" style={{ padding: '2rem', height: '100%' }}>
                <h3 style={{ marginBottom: '1rem' }}>¿Cuantos $ para llegar a...?</h3>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Tu Costo Por Seguidor (CPF) en $
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.8rem',
                            borderRadius: '8px',
                            border: '1px solid var(--card-border)',
                            background: 'rgba(0,0,0,0.2)',
                            color: 'var(--foreground)',
                            fontSize: '1.1rem'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {milestones.map((milestone) => {
                        const cost = calculateCost(milestone);
                        const isCompleted = cost === null;

                        return (
                            <div
                                key={milestone}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.8rem',
                                    background: isCompleted 
                                        ? 'rgba(16, 185, 129, 0.15)' 
                                        : 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    border: isCompleted 
                                        ? '1px solid var(--success)' 
                                        : '1px solid transparent',
                                    opacity: isCompleted ? 0.7 : 1
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {isCompleted && (
                                        <span style={{ fontSize: '1.2rem' }}>✓</span>
                                    )}
                                    <span>
                                        Para llegar a <strong>{formatMilestone(milestone)}</strong>
                                    </span>
                                </div>
                                <span style={{ 
                                    color: isCompleted ? 'var(--success)' : 'var(--accent)', 
                                    fontWeight: 'bold',
                                    fontSize: isCompleted ? '0.9rem' : '1.1rem'
                                }}>
                                    {isCompleted ? '¡Completado!' : <AnimatedCost value={cost!} />}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}