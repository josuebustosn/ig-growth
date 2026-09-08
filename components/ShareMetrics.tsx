'use client';

import { useState, useRef } from 'react';
import { brand, shareBackground } from '@/lib/brand';
import { formatCount, formatDelta } from '@/lib/format';

function toRgb(hexColor: string): [number, number, number] {
    const h = hexColor.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Canvas has no color-mix(); `amount` is how far to travel from a toward b. */
function mixWith(a: string, b: string, amount: number): string {
    const [r1, g1, b1] = toRgb(a);
    const [r2, g2, b2] = toRgb(b);
    const m = (x: number, y: number) => Math.round(x + (y - x) * amount);
    return `rgb(${m(r1, r2)}, ${m(g1, g2)}, ${m(b1, b2)})`;
}

// Canvas has no color-mix(), so brand hex values are given an alpha channel here.
function withAlpha(hexColor: string, alpha: number): string {
    const h = hexColor.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

interface ShareMetricsProps {
    currentFollowers: number;
    history: { date: string; followers: number; change: number }[];
    username: string;
}

type Period = 'today' | 'week' | 'month';

// Simple box blur for iOS compatibility (canvas filter doesn't work in Safari)
function applyBoxBlur(ctx: CanvasRenderingContext2D, width: number, height: number, radius: number) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const tempPixels = new Uint8ClampedArray(pixels);

    const passes = 3; // Multiple passes for smoother blur

    for (let pass = 0; pass < passes; pass++) {
        // Horizontal pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0, count = 0;
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = Math.min(Math.max(x + dx, 0), width - 1);
                    const idx = (y * width + nx) * 4;
                    r += tempPixels[idx];
                    g += tempPixels[idx + 1];
                    b += tempPixels[idx + 2];
                    a += tempPixels[idx + 3];
                    count++;
                }
                const idx = (y * width + x) * 4;
                pixels[idx] = r / count;
                pixels[idx + 1] = g / count;
                pixels[idx + 2] = b / count;
                pixels[idx + 3] = a / count;
            }
        }

        // Copy to temp for vertical pass
        tempPixels.set(pixels);

        // Vertical pass
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let r = 0, g = 0, b = 0, a = 0, count = 0;
                for (let dy = -radius; dy <= radius; dy++) {
                    const ny = Math.min(Math.max(y + dy, 0), height - 1);
                    const idx = (ny * width + x) * 4;
                    r += tempPixels[idx];
                    g += tempPixels[idx + 1];
                    b += tempPixels[idx + 2];
                    a += tempPixels[idx + 3];
                    count++;
                }
                const idx = (y * width + x) * 4;
                pixels[idx] = r / count;
                pixels[idx + 1] = g / count;
                pixels[idx + 2] = b / count;
                pixels[idx + 3] = a / count;
            }
        }

        tempPixels.set(pixels);
    }

    ctx.putImageData(imageData, 0, 0);
}

export default function ShareMetrics({ currentFollowers, history, username, loading = false }: ShareMetricsProps & { loading?: boolean }) {
    const [period, setPeriod] = useState<Period>('today');
    const [isGenerating, setIsGenerating] = useState(false);
    const [successType, setSuccessType] = useState<'copy' | 'download' | 'share' | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const getMetrics = () => {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

        if (period === 'today') {
            const todayEntry = history.find(h => h.date === today);
            return {
                label: 'Hoy',
                change: todayEntry?.change || 0,
                dateRange: new Date().toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    timeZone: 'America/Caracas'
                })
            };
        }

        if (period === 'week') {
            const last7 = history.slice(-7);
            const change = last7.reduce((sum, d) => sum + d.change, 0);
            return {
                label: 'Esta Semana',
                change,
                dateRange: 'Últimos 7 días'
            };
        }

        // month
        const last30 = history.slice(-30);
        const change = last30.reduce((sum, d) => sum + d.change, 0);
        const monthName = new Date().toLocaleDateString('es-ES', { month: 'long', timeZone: 'America/Caracas' });
        return {
            label: 'Este Mes',
            change,
            dateRange: monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' 2025'
        };
    };

    const generateImage = async (): Promise<Blob | null> => {
        setIsGenerating(true);
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const metrics = getMetrics();
        const size = 600;
        canvas.width = size;
        canvas.height = size;

        if (shareBackground.startsWith('#')) {
            // Solid brand color. No blur and no darkening overlay: both exist to
            // make text readable over a photo, and the 80% black overlay below
            // would crush any brand color to near-black (#0F032D -> #030109).
            ctx.fillStyle = shareBackground;
            ctx.fillRect(0, 0, size, size);
        } else {
            // Load background image
            const bgImage = new Image();
            bgImage.crossOrigin = 'anonymous';

            await new Promise<void>((resolve) => {
                bgImage.onload = () => resolve();
                bgImage.onerror = () => resolve();
                bgImage.src = shareBackground;
            });

            // Draw background image
            ctx.drawImage(bgImage, -50, -50, size + 100, size + 100);

            // Apply manual blur (works on iOS/Safari)
            applyBoxBlur(ctx, size, size, 8);

            // Darken the image (more darkness)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, size, size);
        }

        // Accent line at top
        const accentGradient = ctx.createLinearGradient(0, 0, size, 0);
        accentGradient.addColorStop(0, brand.colors.primary);
        accentGradient.addColorStop(1, brand.colors.accent);
        ctx.fillStyle = accentGradient;
        ctx.fillRect(0, 0, size, 5);

        // Load logo
        const logo = new Image();
        logo.crossOrigin = 'anonymous';

        await new Promise<void>((resolve) => {
            logo.onload = () => resolve();
            logo.onerror = () => resolve();
            logo.src = brand.canvasLogo;
        });

        // Draw logo (top right, smaller, more transparent)
        const logoSize = 28;
        ctx.globalAlpha = 0.6;
        ctx.drawImage(logo, size - logoSize - 40, 30, logoSize, logoSize);
        ctx.globalAlpha = 1.0;

        // Main metric with gradient color (aligned with text below)
        const changeText = formatDelta(metrics.change);
        ctx.font = 'bold 120px Inter, system-ui, sans-serif';

        // The gradient is monochrome on purpose. Running it between two distant
        // hues (the lilac accent and the lime positive) mixes through grey in the
        // middle, which is exactly where the digits are — the number faded out
        // halfway across. Interpolating one hue toward white keeps every stop
        // bright. The span is measured from the text itself, so the far stop lands
        // on the last glyph instead of somewhere past it.
        const textWidth = ctx.measureText(changeText).width;
        const base = metrics.change >= 0 ? brand.colors.positive : brand.colors.negative;
        const textGradient = ctx.createLinearGradient(28, 0, 28 + textWidth, 0);
        textGradient.addColorStop(0, base);
        textGradient.addColorStop(1, mixWith(base, brand.colors.light, 0.45));
        ctx.fillStyle = textGradient;
        ctx.fillText(changeText, 28, 280);

        // Label with "en @<username>" (aligned with number)
        ctx.fillStyle = brand.colors.light;
        ctx.font = '28px Inter, system-ui, sans-serif';
        ctx.fillText('seguidores ' + metrics.label.toLowerCase() + ' en @' + username, 40, 330);

        // Total followers
        ctx.fillStyle = withAlpha(brand.colors.light, 0.72);
        ctx.font = '20px Inter, system-ui, sans-serif';
        ctx.fillText(`Total: ${formatCount(currentFollowers)} seguidores en Instagram`, 40, 390);

        // Sparkline of the period. The lower half was empty once the background
        // stopped being a photograph, and the data is already in hand — a picture
        // of the trend says more than another line of text.
        const series = history.slice(-30).map((h) => h.followers);
        if (series.length >= 2) {
            const left = 40, right = size - 40;
            const top = 430, bottom = 520;
            const min = Math.min(...series), max = Math.max(...series);
            const span = max - min || 1;
            const x = (i: number) => left + (i / (series.length - 1)) * (right - left);
            const y = (v: number) => bottom - ((v - min) / span) * (bottom - top);

            // Filled area first, so the stroke sits on top of it.
            const fill = ctx.createLinearGradient(0, top, 0, bottom);
            fill.addColorStop(0, withAlpha(brand.colors.accent, 0.35));
            fill.addColorStop(1, withAlpha(brand.colors.accent, 0));
            ctx.beginPath();
            ctx.moveTo(x(0), bottom);
            series.forEach((v, i) => ctx.lineTo(x(i), y(v)));
            ctx.lineTo(x(series.length - 1), bottom);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();

            ctx.beginPath();
            series.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
            ctx.strokeStyle = brand.colors.positive;
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();

            // A dot on the latest point, so the eye lands on "today".
            ctx.beginPath();
            ctx.arc(x(series.length - 1), y(series[series.length - 1]), 5, 0, Math.PI * 2);
            ctx.fillStyle = brand.colors.positive;
            ctx.fill();

            ctx.fillStyle = withAlpha(brand.colors.light, 0.45);
            ctx.font = '13px Inter, system-ui, sans-serif';
            ctx.fillText(`Últimos ${series.length} días`, left, top - 12);
        }

        // Date at bottom left (with year)
        const dateWithYear = new Date().toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'America/Caracas'
        });
        ctx.fillStyle = withAlpha(brand.colors.light, 0.5);
        ctx.font = '14px Inter, system-ui, sans-serif';
        ctx.fillText(dateWithYear, 40, size - 30);

        // Watermark - bottom right
        ctx.textAlign = 'right';
        ctx.fillText(`${brand.fullName} v${brand.version}`, size - 40, size - 50);
        ctx.fillText(brand.shareDomain, size - 40, size - 30);
        ctx.textAlign = 'left';

        setIsGenerating(false);

        // Return as blob for sharing
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
    };

    const showFeedback = (type: 'copy' | 'download' | 'share') => {
        setSuccessType(type);
        setTimeout(() => setSuccessType(null), 2000);
    };

    // Copy to clipboard - works on PC and Android
    const handleCopy = async () => {
        const blob = await generateImage();
        if (!blob) return;

        // Check if we're on iOS (doesn't support clipboard well)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        if (isIOS) {
            // iOS: Use Web Share API instead
            await handleShare(blob);
            return;
        }

        // PC/Android: Use clipboard
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            showFeedback('copy');
        } catch (e) {
            // Fallback to share if available
            if (typeof navigator.share === 'function') {
                await handleShare(blob);
            } else {
                // Final fallback: download
                downloadBlob(blob);
                showFeedback('download');
            }
        }
    };

    // Share via Web Share API
    const handleShare = async (existingBlob?: Blob) => {
        const blob = existingBlob || await generateImage();
        if (!blob) return;

        const file = new File([blob], `${brand.slug}-${period}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: brand.fullName,
                    text: `Mira mi crecimiento en @${username}!`
                });
                showFeedback('share');
                return;
            } catch (e) {
                // User cancelled - don't show error
                return;
            }
        }

        // Fallback: download
        downloadBlob(blob);
        showFeedback('download');
    };

    // Download as file
    const handleDownload = async () => {
        const blob = await generateImage();
        if (!blob) return;

        // On mobile, prefer share
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const file = new File([blob], `${brand.slug}-${period}.png`, { type: 'image/png' });

        if (isMobile && navigator.share && navigator.canShare?.({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: brand.fullName,
                    text: `Mira mi crecimiento en @${username}!`
                });
                showFeedback('share');
                return;
            } catch (e) {
                // User cancelled or error, fall through to download
            }
        }

        // Regular download
        downloadBlob(blob);
        showFeedback('download');
    };

    const downloadBlob = (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${brand.slug}-${period}-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    const getButtonLabel = (type: 'copy' | 'download') => {
        if (successType === 'copy') return '✓ Copiado!';
        if (successType === 'share') return '✓ Compartido!';
        if (successType === 'download') return '✓ Descargado!';

        return type === 'copy' ? '📋 Copiar imagen' : '💾 Descargar imagen';
    };

    if (loading) {
        const shimmerStyle = {
            background: 'linear-gradient(90deg, var(--card-bg) 25%, var(--card-border) 50%, var(--card-bg) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '8px'
        };
        return (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ ...shimmerStyle, width: '180px', height: '24px', marginBottom: '1rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ ...shimmerStyle, flex: 1, height: '36px' }} />
                    ))}
                </div>
                <div style={{ ...shimmerStyle, width: '100%', height: '120px', marginBottom: '1rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ ...shimmerStyle, flex: 1, height: '42px' }} />
                    <div style={{ ...shimmerStyle, flex: 1, height: '42px' }} />
                </div>
            </div>
        );
    }

    const periods: { value: Period; label: string }[] = [
        { value: 'today', label: 'Hoy' },
        { value: 'week', label: 'Semana' },
        { value: 'month', label: '30d' },
    ];

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>📤 Compartir Logros</h3>

            {/* Period Selector */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', position: 'relative' }}>
                {periods.map((p) => (
                    <button
                        key={p.value}
                        onClick={() => setPeriod(p.value)}
                        style={{
                            flex: 1,
                            padding: '0.5rem',
                            borderRadius: '8px',
                            border: period === p.value
                                ? '1px solid var(--primary)'
                                : '1px solid var(--card-border)',
                            cursor: 'pointer',
                            background: period === p.value
                                ? 'color-mix(in srgb, var(--primary) 12%, transparent)'
                                : 'transparent',
                            color: period === p.value ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: period === p.value ? '600' : '400',
                            transition: 'all 0.25s ease',
                            boxShadow: period === p.value
                                ? '0 0 12px color-mix(in srgb, var(--primary) 20%, transparent)'
                                : 'none',
                        }}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Preview */}
            <div style={{
                background: 'linear-gradient(135deg, var(--brand-dark), color-mix(in srgb, var(--brand-primary) 22%, var(--brand-dark)))',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                textAlign: 'center'
            }}>
                <div key={period} style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        {getMetrics().dateRange}
                    </p>
                    <p style={{
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: getMetrics().change >= 0 ? 'var(--success)' : 'var(--danger)'
                    }}>
                        {getMetrics().change >= 0 ? '+' : ''}{getMetrics().change}
                    </p>
                    <p style={{ fontSize: '0.9rem', color: 'white' }}>
                        seguidores {getMetrics().label.toLowerCase()}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={handleCopy}
                    disabled={isGenerating}
                    style={{
                        flex: 1,
                        padding: '0.7rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                        border: '1px solid var(--primary)',
                        color: 'var(--primary)',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {successType === 'copy' ? '✓ Copiado!' : successType === 'share' ? '✓ Compartido!' : '📋 Copiar imagen'}
                </button>
                <button
                    onClick={handleDownload}
                    disabled={isGenerating}
                    style={{
                        flex: 1,
                        padding: '0.7rem',
                        borderRadius: '8px',
                        border: '1px solid var(--card-border)',
                        cursor: 'pointer',
                        background: 'transparent',
                        color: 'var(--foreground)',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {successType === 'download' ? '✓ Descargado!' : successType === 'share' ? '✓ Compartido!' : '💾 Descargar imagen'}
                </button>
            </div>

            {/* Hidden Canvas */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
}
