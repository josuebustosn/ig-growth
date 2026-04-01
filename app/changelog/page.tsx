'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';

interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    changes: {
        type: 'feature' | 'fix' | 'deploy';
        description: string;
    }[];
}

const typeStyles = {
    feature: { bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', label: '✨ Nueva' },
    fix: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', label: '🔧 Fix' },
    deploy: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', label: '🚀 Deploy' }
};

export default function ChangelogPage() {
    const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/changelog.json')
            .then(res => res.json())
            .then(data => {
                setChangelog(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <main className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
                <Link
                    href="/"
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}
                >
                    <Image
                        src="/trawi-logo.jpg"
                        alt="Trawi Logo"
                        width={50}
                        height={50}
                        style={{ borderRadius: '8px' }}
                        className="logo-hover"
                    />
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>TrawiStats 1.2</h1>
                </Link>
                <ThemeToggle />
            </header>

            <section className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋 Changelog</h2>
                <p style={{ color: 'var(--text-muted)' }}>Historial de cambios y mejoras del sistema</p>
            </section>

            {loading ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    Cargando...
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {changelog.map((release) => (
                        <article key={release.version} className="glass-panel" style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.5rem' }}>
                                    <span className="text-gradient">v{release.version}</span>
                                    <span style={{ marginLeft: '0.5rem', fontWeight: 'normal', opacity: 0.8 }}>
                                        — {release.title}
                                    </span>
                                </h3>
                                <span style={{
                                    color: 'var(--text-muted)',
                                    fontSize: '0.9rem',
                                    padding: '0.3rem 0.8rem',
                                    background: 'var(--card-bg)',
                                    borderRadius: '20px'
                                }}>
                                    {new Date(release.date).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>

                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {release.changes.map((change, idx) => {
                                    const style = typeStyles[change.type];
                                    return (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                background: style.bg,
                                                color: style.color,
                                                fontWeight: '600',
                                                minWidth: '70px',
                                                textAlign: 'center'
                                            }}>
                                                {style.label}
                                            </span>
                                            <span>{change.description}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </article>
                    ))}
                </div>
            )}

            {/* Easter egg credit */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '3rem',
                opacity: 0.7
            }}>
                <Image
                    src="/Trawayana.png"
                    alt="Trawayana"
                    width={120}
                    height={120}
                    style={{ borderRadius: '12px' }}
                />
            </div>

            <footer style={{ textAlign: 'center', marginTop: '2rem', padding: '1rem', opacity: 0.6 }}>
                <Link href="/" style={{ color: 'var(--primary)' }}>← Volver al Dashboard</Link>
            </footer>
        </main>
    );
}
