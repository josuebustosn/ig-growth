'use client';

import { useState } from 'react';

interface DailyStats {
    date: string;
    followers: number;
    change: number;
}

export default function Calculators({ currentFollowers, history }: { currentFollowers: number, history: DailyStats[] }) {
    const [cpf, setCpf] = useState<string>('0.12');

    // Milestones dinámicos
    const milestones = [10000, 20000, 50000, 100000, 500000, 1000000];

    const calculateCost = (target: number) => {
        if (target <= currentFollowers) return null; // Milestone completado
        const needed = target - currentFollowers;
        const cost = needed * parseFloat(cpf || '0');
        return cost.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    };

    const formatMilestone = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
        return num.toLocaleString('es-ES');
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {/* CPF Projection */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
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
                                    {isCompleted ? '¡Completado!' : cost}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}