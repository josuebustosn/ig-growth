'use client';

import { useState, useMemo } from 'react';

interface DailyStats {
    date: string;
    followers: number;
    change: number;
}

export default function GrowthCalendar({ history = [] }: { history: DailyStats[] }) {
    const [selectedPeriod, setSelectedPeriod] = useState<string>('last30');

    // Get available months from history
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        history.forEach(day => {
            const date = new Date(day.date + 'T00:00:00');
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(monthKey);
        });
        return Array.from(months).sort().reverse();
    }, [history]);

    // Filter history based on selected period
    const filteredHistory = useMemo(() => {
        if (selectedPeriod === 'last30') {
            return history.slice(-30);
        } else {
            // Filter by specific month
            return history.filter(day => {
                const date = new Date(day.date + 'T00:00:00');
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                return monthKey === selectedPeriod;
            });
        }
    }, [history, selectedPeriod]);

    // Calculate total for period
    const periodTotal = filteredHistory.reduce((sum, day) => sum + day.change, 0);

    // Get period label
    const getPeriodLabel = () => {
        if (selectedPeriod === 'last30') {
            return 'Últimos 30 días';
        } else {
            const [year, month] = selectedPeriod.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        }
    };

    if (history.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Crecimiento</h3>
                <p style={{ opacity: 0.6 }}>No hay datos históricos disponibles aún.</p>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <h3 style={{ fontSize: '1.5rem' }}>Crecimiento</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--card-border)',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value="last30">Últimos 30 días</option>
                        {availableMonths.map(month => {
                            const [year, monthNum] = month.split('-');
                            const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                            const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
                            return (
                                <option key={month} value={month}>
                                    {label.charAt(0).toUpperCase() + label.slice(1)}
                                </option>
                            );
                        })}
                    </select>
                    <span style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        background: periodTotal >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: periodTotal >= 0 ? 'var(--success)' : 'var(--danger)',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap'
                    }}>
                        {periodTotal > 0 ? '+' : ''}{periodTotal}
                    </span>
                </div>
            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
                gap: '0.8rem'
            }}>
                {filteredHistory.map((day, index) => (
                    <div
                        key={index}
                        className="calendar-day"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            background: day.change >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${day.change >= 0 ? 'var(--success)' : 'var(--danger)'}`,
                            color: day.change >= 0 ? 'var(--success)' : 'var(--danger)',
                            cursor: 'default',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                    >
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                            {new Date(day.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                        <span style={{ fontWeight: 'bold' }}>{day.change > 0 ? '+' : ''}{day.change}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
