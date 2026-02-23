'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Powerup } from '@/lib/types'

const MAX_PICKS = 3

export default function DraftPage() {
    const [powerups, setPowerups] = useState<Powerup[]>([])
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [feedback, setFeedback] = useState('')
    const router = useRouter()

    useEffect(() => {
        const teamId = localStorage.getItem('team_id')
        if (!teamId) { router.push('/'); return }

        fetch('/api/powerups')
            .then((res) => res.json())
            .then((data) => {
                if (data.powerups) setPowerups(data.powerups)
                setLoading(false)
            })
    }, [router])

    function togglePowerup(id: string) {
        const next = new Set(selected)
        if (next.has(id)) {
            next.delete(id)
        } else {
            if (next.size >= MAX_PICKS) return
            next.add(id)
        }
        setSelected(next)
    }

    async function handleConfirm() {
        const teamId = localStorage.getItem('team_id')
        if (!teamId || selected.size === 0) return

        setSubmitting(true)
        try {
            const res = await fetch('/api/powerups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_id: teamId, powerup_ids: Array.from(selected) }),
            })
            const data = await res.json()

            if (res.ok) {
                router.push('/play')
            } else {
                setFeedback(data.error || 'Failed to select powerups')
            }
        } catch {
            setFeedback('Connection error')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <main className="page-container flex-center">
                <div className="animate-pulse glow-text" style={{ fontSize: 'var(--font-xl)', color: 'var(--neon-primary)' }}>LOADING...</div>
            </main>
        )
    }

    return (
        <main className="page-container" style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-5) var(--space-4)' }}>
            {/* Header */}
            <div className="text-center animate-fade-in-up" style={{ marginBottom: 'var(--space-5)' }}>
                <p className="text-mono" style={{ fontSize: 'var(--font-xs)', letterSpacing: 4, color: 'var(--neon-warning)', marginBottom: 'var(--space-2)' }}>
                    ⚡ CHOOSE YOUR ARSENAL
                </p>
                <h1 className="glow-text" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 800, marginBottom: 'var(--space-3)' }}>
                    POWERUP DRAFT
                </h1>

                {/* Selection Slots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                    {Array.from({ length: MAX_PICKS }).map((_, i) => {
                        const selectedArr = Array.from(selected)
                        const picked = powerups.find((p) => p.id === selectedArr[i])
                        return (
                            <div
                                key={i}
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 12,
                                    border: picked ? '2px solid var(--neon-primary)' : '2px dashed rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: picked ? '1.5rem' : '1rem',
                                    background: picked ? 'rgba(0, 255, 170, 0.08)' : 'rgba(255,255,255,0.03)',
                                    boxShadow: picked ? '0 0 20px rgba(0, 255, 170, 0.15)' : 'none',
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {picked ? picked.icon : <span style={{ opacity: 0.2 }}>+</span>}
                            </div>
                        )
                    })}
                </div>
                <p className="text-mono" style={{ fontSize: 'var(--font-xs)', color: selected.size === MAX_PICKS ? 'var(--neon-success)' : 'rgba(255,255,255,0.4)' }}>
                    {selected.size} / {MAX_PICKS} selected
                </p>
            </div>

            {/* Powerup Cards — Glass Style */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                {powerups.map((p) => {
                    const isSelected = selected.has(p.id)
                    const isDisabled = !isSelected && selected.size >= MAX_PICKS
                    return (
                        <button
                            key={p.id}
                            onClick={() => togglePowerup(p.id)}
                            disabled={isDisabled}
                            style={{
                                textAlign: 'center',
                                padding: 'var(--space-5) var(--space-4)',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                borderRadius: 16,
                                border: isSelected
                                    ? '2px solid var(--neon-primary)'
                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                background: isSelected
                                    ? 'linear-gradient(135deg, rgba(0, 255, 170, 0.12) 0%, rgba(0, 200, 140, 0.06) 100%)'
                                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                backdropFilter: 'blur(12px)',
                                boxShadow: isSelected
                                    ? '0 0 30px rgba(0, 255, 170, 0.12), inset 0 1px 0 rgba(255,255,255,0.1)'
                                    : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                                opacity: isDisabled ? 0.3 : 1,
                                transition: 'all 0.25s ease',
                                transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                                position: 'relative' as const,
                                overflow: 'hidden',
                            }}
                        >
                            {/* Icon */}
                            <div style={{
                                fontSize: '2.5rem',
                                marginBottom: 'var(--space-3)',
                                filter: isSelected ? 'drop-shadow(0 0 8px rgba(0,255,170,0.4))' : 'none',
                                transition: 'filter 0.3s ease',
                            }}>
                                {p.icon}
                            </div>

                            {/* Name — bright white for readability */}
                            <p style={{
                                fontWeight: 700,
                                fontSize: 'var(--font-base)',
                                color: isSelected ? 'var(--neon-primary)' : '#ffffff',
                                marginBottom: 'var(--space-2)',
                                letterSpacing: 0.5,
                            }}>
                                {p.name}
                            </p>

                            {/* Description — visible light gray */}
                            <p style={{
                                fontSize: 'var(--font-xs)',
                                color: 'rgba(255, 255, 255, 0.65)',
                                lineHeight: 1.5,
                                marginBottom: isSelected ? 'var(--space-3)' : 0,
                            }}>
                                {p.description}
                            </p>

                            {/* Score penalty note */}
                            <p style={{
                                fontSize: '0.65rem',
                                color: 'rgba(255, 200, 50, 0.5)',
                                fontFamily: 'var(--font-mono)',
                                marginTop: 'var(--space-1)',
                            }}>
                                -10% score penalty
                            </p>

                            {/* Selected badge */}
                            {isSelected && (
                                <div style={{
                                    marginTop: 'var(--space-2)',
                                    padding: '4px 12px',
                                    borderRadius: 20,
                                    background: 'rgba(0, 255, 170, 0.15)',
                                    color: 'var(--neon-primary)',
                                    fontSize: 'var(--font-xs)',
                                    fontWeight: 600,
                                    fontFamily: 'var(--font-mono)',
                                    display: 'inline-block',
                                }}>
                                    ✓ SELECTED
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>

            {feedback && (
                <p className="text-mono" style={{ textAlign: 'center', fontSize: 'var(--font-sm)', color: 'var(--neon-danger)', marginBottom: 'var(--space-3)' }}>
                    {feedback}
                </p>
            )}

            {/* Confirm */}
            <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={selected.size === 0 || submitting}
                style={{
                    width: '100%',
                    fontSize: 'var(--font-lg)',
                    padding: 'var(--space-3) var(--space-5)',
                    borderRadius: 12,
                    fontWeight: 700,
                    letterSpacing: 1,
                }}
            >
                {submitting ? 'CONFIRMING...' : `CONFIRM ${selected.size} POWERUPS →`}
            </button>

            {/* Skip option */}
            <button
                onClick={() => router.push('/play')}
                style={{
                    width: '100%',
                    marginTop: 'var(--space-3)',
                    padding: 'var(--space-2)',
                    fontSize: 'var(--font-sm)',
                    color: 'rgba(255,255,255,0.35)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
            >
                SKIP — Play without powerups
            </button>
        </main>
    )
}
