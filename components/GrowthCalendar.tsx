'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

interface DailyStats {
    date: string;
    followers: number;
    change: number;
}

export default function GrowthCalendar({ history = [], loading = false }: { history: DailyStats[], loading?: boolean }) {
    const [selectedPeriod, setSelectedPeriod] = useState<string>('last30');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

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

    // Format month label: current year = just month name, other years = "Mes (year)"
    const currentYear = new Date().getFullYear();

    const formatMonthLabel = (monthKey: string) => {
        const [year, monthNum] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
        const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        return parseInt(year) !== currentYear ? `${capitalized} (${year})` : capitalized;
    };

    // Get period label
    const getPeriodLabel = () => {
        if (selectedPeriod === 'last30') {
            return '30 días';
        }
        return formatMonthLabel(selectedPeriod);
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ ...shimmerStyle, width: '150px', height: '28px' }} />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ ...shimmerStyle, width: '140px', height: '32px' }} />
                        <div style={{ ...shimmerStyle, width: '50px', height: '32px', borderRadius: '20px' }} />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.8rem' }}>
                    {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} style={{ ...shimmerStyle, height: '52px' }} />
                    ))}
                </div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '2rem', height: '100%' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Crecimiento</h3>
                <p style={{ opacity: 0.6 }}>No hay datos históricos disponibles aún.</p>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ padding: '2rem', height: '100%' }}>
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
                    <div ref={dropdownRef} style={{ position: 'relative' }}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            style={{
                                padding: '0.4rem 2rem 0.4rem 0.8rem',
                                borderRadius: '8px',
                                background: 'var(--card-bg)',
                                border: '1px solid var(--card-border)',
                                color: 'var(--foreground)',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                outline: 'none',
                                position: 'relative',
                                whiteSpace: 'nowrap',
                                transition: 'border-color 0.2s ease'
                            }}
                        >
                            {getPeriodLabel()}
                            <span style={{
                                position: 'absolute',
                                right: '0.6rem',
                                top: '50%',
                                transform: `translateY(-50%) rotate(${dropdownOpen ? '180deg' : '0deg'})`,
                                transition: 'transform 0.2s ease',
                                fontSize: '0.7rem',
                                opacity: 0.6
                            }}>▼</span>
                        </button>
                        {dropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                right: 0,
                                minWidth: '100%',
                                background: 'var(--background)',
                                border: '1px solid var(--card-border)',
                                borderRadius: '10px',
                                boxShadow: '0 8px 24px var(--control-bg)',
                                zIndex: 50,
                                overflow: 'hidden',
                                animation: 'dropdownIn 0.15s ease-out'
                            }}>
                                {[
                                    { value: 'last30', label: '30 días' },
                                    ...availableMonths.map(month => ({
                                        value: month,
                                        label: formatMonthLabel(month)
                                    }))
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => { setSelectedPeriod(option.value); setDropdownOpen(false); }}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '0.6rem 1rem',
                                            border: 'none',
                                            background: selectedPeriod === option.value ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'transparent',
                                            color: selectedPeriod === option.value ? 'var(--primary)' : 'var(--foreground)',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            whiteSpace: 'nowrap',
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (selectedPeriod !== option.value)
                                                e.currentTarget.style.background = 'color-mix(in srgb, var(--foreground) 5%, transparent)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = selectedPeriod === option.value
                                                ? 'color-mix(in srgb, var(--primary) 15%, transparent)' : 'transparent';
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <span style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        background: periodTotal >= 0 ? 'color-mix(in srgb, var(--success) 15%, transparent)' : 'color-mix(in srgb, var(--danger) 15%, transparent)',
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
                        key={`${selectedPeriod}-${index}`}
                        className="calendar-day"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            background: day.change >= 0 ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'color-mix(in srgb, var(--danger) 10%, transparent)',
                            border: `1px solid ${day.change >= 0 ? 'var(--success)' : 'var(--danger)'}`,
                            color: day.change >= 0 ? 'var(--success)' : 'var(--danger)',
                            cursor: 'default',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            animation: `calendarDayIn 0.3s ease-out ${index * 15}ms both`
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
