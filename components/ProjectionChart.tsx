'use client';

import { useMemo, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Area,
    ComposedChart
} from 'recharts';
import { formatCount } from '@/lib/format';

interface DailyStats {
    date: string;
    followers: number;
    change: number;
}

interface ProjectionChartProps {
    history: DailyStats[];
    currentFollowers: number;
    loading?: boolean;
}

export default function ProjectionChart({ history, currentFollowers, loading = false }: ProjectionChartProps) {
    const [simulatedGrowth, setSimulatedGrowth] = useState<string>('');

    // Milestones (same as Calculators)
    const milestones = [10000, 20000, 50000, 100000, 500000, 1000000];

    // Find next milestone
    const nextMilestone = useMemo(() => {
        return milestones.find(m => m > currentFollowers) || milestones[milestones.length - 1];
    }, [currentFollowers]);

    // Calculate SMART average daily growth (weighted + trend analysis)
    const smartAvgGrowth = useMemo(() => {
        if (history.length < 2) return 0;
        
        const today = new Date().toISOString().split('T')[0];
        const completedDays = history.filter(h => h.date !== today);
        if (completedDays.length === 0) return 0;

        // Use exponential moving average (EMA) - more weight to recent data
        const recentDays = completedDays.slice(-14); // Last 2 weeks
        
        if (recentDays.length === 0) return 0;

        // Calculate EMA with alpha = 0.3 (gives 70% weight to history, 30% to new data)
        let ema = recentDays[0].change;
        const alpha = 0.3;
        
        for (let i = 1; i < recentDays.length; i++) {
            ema = alpha * recentDays[i].change + (1 - alpha) * ema;
        }

        // Apply trend factor: check if growth is accelerating or decelerating
        if (recentDays.length >= 7) {
            const firstWeekAvg = recentDays.slice(0, 7).reduce((sum, d) => sum + d.change, 0) / 7;
            const secondWeekAvg = recentDays.slice(-7).reduce((sum, d) => sum + d.change, 0) / 7;
            const trendFactor = secondWeekAvg / firstWeekAvg;
            
            // Apply trend but cap it between 0.8 and 1.2 to avoid wild projections
            const cappedTrend = Math.max(0.8, Math.min(1.2, trendFactor));
            ema = ema * cappedTrend;
        }

        return Math.max(0, ema); // Never negative
    }, [history]);

    // Calculate days to next milestone
    const daysToMilestone = useMemo(() => {
        const growthRate = simulatedGrowth ? parseFloat(simulatedGrowth) : smartAvgGrowth;
        if (growthRate <= 0 || currentFollowers >= nextMilestone) return null;
        const remaining = nextMilestone - currentFollowers;
        return Math.ceil(remaining / growthRate);
    }, [currentFollowers, smartAvgGrowth, simulatedGrowth, nextMilestone]);

    // Format estimated date
    const estimatedDate = useMemo(() => {
        if (!daysToMilestone) return null;
        const date = new Date();
        date.setDate(date.getDate() + daysToMilestone);
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'America/Caracas'
        });
    }, [daysToMilestone]);

    // Find completion dates for milestones
    const getMilestoneCompletionDate = (milestone: number) => {
        const entry = history.find(h => h.followers >= milestone);
        if (!entry) return null;
        const date = new Date(entry.date + 'T00:00:00');
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const data = useMemo(() => {
        if (!history || history.length < 2) return [];

        // 1. Prepare Historical Data
        const chartData = history.map(h => ({
            date: h.date,
            timestamp: new Date(h.date).getTime(),
            actual: h.followers as number | null,
            projected: null as number | null,
            isProjection: false
        }));

        // 2. Calculate Growth Rate
        let growthRate = 0;

        if (simulatedGrowth && parseFloat(simulatedGrowth) > 0) {
            growthRate = parseFloat(simulatedGrowth);
        } else {
            growthRate = smartAvgGrowth;
        }

        if (growthRate <= 0) return chartData; // No growth to project

        // 3. Project Future
        const lastDay = history[history.length - 1];
        let currentCount = lastDay.followers;
        let currentDate = new Date(lastDay.date);

        // Connect the lines
        chartData[chartData.length - 1].projected = currentCount;

        // Project to next milestone + 10% buffer
        const maxTarget = nextMilestone * 1.1;

        // Limit projection to 2 years or until max target reached
        let daysProjected = 0;
        const maxDays = 730;

        while (currentCount < maxTarget && daysProjected < maxDays) {
            daysProjected++;
            currentDate.setDate(currentDate.getDate() + 1);
            currentCount += growthRate;

            chartData.push({
                date: currentDate.toISOString().split('T')[0],
                timestamp: currentDate.getTime(),
                actual: null,
                projected: Math.round(currentCount),
                isProjection: true
            });
        }

        return chartData;
    }, [history, simulatedGrowth, smartAvgGrowth, nextMilestone]);

    if (loading) {
        const shimmerStyle = {
            background: 'linear-gradient(90deg, var(--card-bg) 25%, var(--card-border) 50%, var(--card-bg) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '8px'
        };
        return (
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ ...shimmerStyle, width: '250px', height: '28px' }} />
                    <div style={{ ...shimmerStyle, width: '200px', height: '32px' }} />
                </div>
                <div style={{ ...shimmerStyle, width: '100%', height: '400px', marginBottom: '1.5rem' }} />
                <div style={{ ...shimmerStyle, width: '100%', height: '80px', marginBottom: '1rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ ...shimmerStyle, width: '80px', height: '28px', borderRadius: '12px' }} />
                    <div style={{ ...shimmerStyle, width: '80px', height: '28px', borderRadius: '12px' }} />
                </div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Proyección de Crecimiento</h3>
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.7 }}>
                    <p>Se necesitan al menos 2 días de datos para generar una proyección.</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Vuelve mañana para ver tu curva de crecimiento.</p>
                </div>
            </div>
        );
    }

    const formatXAxis = (tickItem: string) => {
        const date = new Date(tickItem + 'T00:00:00');
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    };

    const formatYAxis = (tickItem: number) => {
        if (tickItem >= 1000000) return `${(tickItem / 1000000).toFixed(1)}M`;
        if (tickItem >= 1000) return `${(tickItem / 1000).toFixed(1)}k`;
        return tickItem.toString();
    };

    const formatMilestone = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
        return formatCount(num);
    };

    // Progress bar calculations for next milestone
    const previousMilestone = milestones[milestones.indexOf(nextMilestone) - 1] || 0;
    const progress = ((currentFollowers - previousMilestone) / (nextMilestone - previousMilestone)) * 100;
    const followersRemaining = Math.max(0, nextMilestone - currentFollowers);

    // Get relevant milestones for graph (visible range)
    const relevantMilestones = milestones.filter(m => 
        m <= nextMilestone * 1.2 && m >= currentFollowers * 0.3
    );

    return (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.5rem' }}>Proyección de Crecimiento</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Simular crecimiento (diario):</label>
                    <input
                        type="number"
                        value={simulatedGrowth}
                        onChange={(e) => setSimulatedGrowth(e.target.value)}
                        placeholder="Auto"
                        style={{
                            padding: '0.4rem',
                            borderRadius: '6px',
                            border: '1px solid var(--card-border)',
                            background: 'var(--control-bg)',
                            color: 'var(--foreground)',
                            width: '80px'
                        }}
                    />
                </div>
            </div>

            <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                    <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--control-border)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickFormatter={formatXAxis}
                            stroke="var(--text-muted)"
                            fontSize={12}
                            minTickGap={50}
                        />
                        <YAxis
                            tickFormatter={formatYAxis}
                            stroke="var(--text-muted)"
                            fontSize={12}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--card-bg)', border: 'var(--glass-border)', borderRadius: '8px' }}
                            labelStyle={{ color: 'var(--foreground)' }}
                            formatter={(value, name) => [formatCount(Number(value)), name === 'actual' ? 'Real' : 'Proyección']}
                            labelFormatter={(label) => new Date(label + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        />

                        {/* Actual Data Area */}
                        <Area
                            type="monotone"
                            dataKey="actual"
                            stroke="var(--primary)"
                            fillOpacity={1}
                            fill="url(#colorActual)"
                            strokeWidth={2}
                        />

                        {/* Projected Data Line (Dashed/Faded) */}
                        <Line
                            type="monotone"
                            dataKey="projected"
                            stroke="var(--accent)"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6 }}
                        />

                        {/* Dynamic Milestones Reference Lines */}
                        {relevantMilestones.map(milestone => (
                            <ReferenceLine
                                key={milestone}
                                y={milestone}
                                stroke={milestone <= currentFollowers ? "var(--success)" : "var(--accent)"}
                                strokeDasharray="3 3"
                                strokeOpacity={milestone <= currentFollowers ? 0.5 : 0.8}
                                label={{
                                    value: formatMilestone(milestone),
                                    position: 'right',
                                    fill: milestone <= currentFollowers ? "var(--success)" : "var(--accent)",
                                    fontSize: 12,
                                    opacity: milestone <= currentFollowers ? 0.7 : 1
                                }}
                            />
                        ))}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Next Milestone Progress Bar */}
            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'var(--control-bg)',
                borderRadius: '12px'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                }}>
                    <span style={{ fontWeight: '600' }}>🎯 Meta: {formatMilestone(nextMilestone)} seguidores</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {formatCount(currentFollowers)} / {formatMilestone(nextMilestone)}
                    </span>
                </div>

                {/* Progress bar */}
                <div style={{
                    width: '100%',
                    height: '12px',
                    background: 'var(--control-border)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    marginBottom: '0.8rem'
                }}>
                    <div style={{
                        width: `${Math.min(progress, 100)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                        borderRadius: '6px',
                        transition: 'width 1s ease'
                    }} />
                </div>

                {/* Stats */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)'
                }}>
                    <span>
                        Faltan: <span style={{ color: 'var(--foreground)', fontWeight: '600' }}>
                            {formatCount(followersRemaining)}
                        </span>
                    </span>
                    {estimatedDate && daysToMilestone && (
                        <span>
                            Estimado: <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                                {estimatedDate}
                            </span>
                            <span style={{ opacity: 0.7 }}> (~{daysToMilestone} días)</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Completed Milestones */}
            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {milestones.filter(m => m <= currentFollowers).map(milestone => {
                    const completionDate = getMilestoneCompletionDate(milestone);
                    return (
                        <div
                            key={milestone}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.3rem 0.6rem',
                                background: 'color-mix(in srgb, var(--success) 15%, transparent)',
                                border: '1px solid var(--success)',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                color: 'var(--success)',
                                opacity: 0.8
                            }}
                        >
                            <span>✓</span>
                            <span>{formatMilestone(milestone)}</span>
                            {completionDate && (
                                <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>({completionDate})</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
