'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';

// Songs mapped to days of the week (0 = Sunday, 6 = Saturday)
const DAILY_SONGS = [
    { file: 'Triwikini.mp3', name: 'Triwikini' },
    { file: '#Tráwico.mp3', name: '#Tráwico' },
    { file: 'La Noche Que No Había Trawi.mp3', name: 'La Noche Que No Había Trawi' },
    { file: 'Tendencia Trawional.mp3', name: 'Tendencia Trawional' },
    { file: 'Trawi Un Break.mp3', name: 'Trawi Un Break' },
    { file: 'Trawime Pasa (Piscis).mp3', name: 'Trawime Pasa (Piscis)' },
    { file: 'Hora Trawi.mp3', name: 'Hora Trawi' },
];

export default function MusicPlayer() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [audioLevel, setAudioLevel] = useState<number[]>([0.2, 0.4, 0.6, 0.4, 0.2]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const animationRef = useRef<number | null>(null);

    // Get today's song based on day of week
    const today = new Date().getDay();
    const currentSong = DAILY_SONGS[today];

    // Memoized visualization updater
    const updateVisualization = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Get 5 frequency bands with more dynamic range
        const bands = [
            Math.max(0.15, dataArray[2] / 255),
            Math.max(0.15, dataArray[4] / 255),
            Math.max(0.15, dataArray[6] / 255),
            Math.max(0.15, dataArray[8] / 255),
            Math.max(0.15, dataArray[10] / 255),
        ];
        setAudioLevel(bands);

        animationRef.current = requestAnimationFrame(updateVisualization);
    }, []);

    useEffect(() => {
        // Create audio element
        audioRef.current = new Audio(`/Music/${encodeURIComponent(currentSong.file)}`);
        audioRef.current.loop = true;
        audioRef.current.crossOrigin = 'anonymous';

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [currentSong.file]);

    const setupAnalyser = async () => {
        if (!audioRef.current || analyserRef.current) return;

        try {
            // Create or resume AudioContext (requires user interaction)
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }

            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            // Only create source once per audio element
            if (!sourceRef.current) {
                sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
            }

            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.7;

            sourceRef.current.connect(analyser);
            analyser.connect(audioContextRef.current.destination);
            analyserRef.current = analyser;
        } catch (e) {
            console.log('Audio visualizer setup error:', e);
        }
    };

    const togglePlay = async () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            // Reset to resting state
            setAudioLevel([0.2, 0.4, 0.6, 0.4, 0.2]);
        } else {
            await setupAnalyser();
            await audioRef.current.play();
            updateVisualization();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '0.5rem',
            }}
        >
            {/* Expanded Card - Now appears to the LEFT */}
            <div
                style={{
                    background: 'var(--card-bg)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '12px',
                    padding: isExpanded ? '0.8rem' : '0',
                    maxWidth: isExpanded ? '220px' : '0',
                    opacity: isExpanded ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    border: isExpanded ? '1px solid var(--card-border)' : 'none',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    whiteSpace: 'nowrap',
                }}
            >
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                    <Image
                        src="/Trawayana.png"
                        alt="Trawayana"
                        width={50}
                        height={50}
                        style={{ borderRadius: '8px' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                            Canción del día
                        </p>
                        <p style={{
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '130px'
                        }}>
                            {currentSong.name}
                        </p>
                    </div>
                </div>
            </div>

            {/* Floating Button with Visualizer */}
            <button
                onClick={togglePlay}
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => !isPlaying && setIsExpanded(false)}
                style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: isPlaying
                        ? 'linear-gradient(135deg, var(--primary), var(--accent))'
                        : 'var(--card-bg)',
                    border: isPlaying ? 'none' : '1px solid var(--card-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s ease',
                    flexShrink: 0,
                }}
            >
                {isPlaying ? (
                    // Visualizer bars
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '20px' }}>
                        {audioLevel.map((level, i) => (
                            <div
                                key={i}
                                style={{
                                    width: '3px',
                                    height: `${Math.max(4, level * 20)}px`,
                                    background: 'white',
                                    borderRadius: '2px',
                                    transition: 'height 0.05s linear',
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    // Music icon
                    <span style={{ fontSize: '1.2rem' }}>🎵</span>
                )}
            </button>
        </div>
    );
}
