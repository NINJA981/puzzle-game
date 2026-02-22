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
                <div className="animate-pulse text-neon glow-text" style={{ fontSize: 'var(--font-xl)' }}>LOADING...</div>
            </main>
        )
    }

    return (
        <main className="page-container" style={{ maxWidth: 700, margin: '0 auto' }}>
            <div className="text-center animate-fade-in-up" style={{ marginBottom: 'var(--space-6)' }}>
                <h1 className="glow-text" style={{ fontSize: 'var(--font-3xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                    POWERUP DRAFT
                </h1>
                <p className="text-mono text-muted" style={{ fontSize: 'var(--font-sm)' }}>
                    SELECT {MAX_PICKS} POWERUPS FOR THIS ROUND
                </p>
                <p className="text-mono" style={{ fontSize: 'var(--font-xs)', color: 'var(--neon-warning)', marginTop: 'var(--space-1)' }}>
                    {selected.size} / {MAX_PICKS} selected
                </p>
            </div>

            {/* Powerup Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                {powerups.map((p) => {
                    const isSelected = selected.has(p.id)
                    const isDisabled = !isSelected && selected.size >= MAX_PICKS
                    return (
                        <button
                            key={p.id}
                            onClick={() => togglePowerup(p.id)}
                            disabled={isDisabled}
                            className="card"
                            style={{
                                textAlign: 'center',
                                padding: 'var(--space-4)',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                border: isSelected ? '2px solid var(--neon-primary)' : '1px solid var(--border-dim)',
                                boxShadow: isSelected ? 'var(--glow-sm)' : 'none',
                                background: isSelected ? 'rgba(0, 255, 170, 0.05)' : 'var(--bg-card)',
                                opacity: isDisabled ? 0.4 : 1,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>{p.icon}</div>
                            <p style={{ fontWeight: 700, fontSize: 'var(--font-base)', marginBottom: 'var(--space-1)' }}>
                                {p.name}
                            </p>
                            <p className="text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                                {p.description}
                            </p>
                            {isSelected && (
                                <div className="badge badge-success" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-xs)' }}>
                                    SELECTED
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
                style={{ width: '100%', fontSize: 'var(--font-lg)', padding: 'var(--space-3) var(--space-5)' }}
            >
                {submitting ? 'CONFIRMING...' : `CONFIRM ${selected.size} POWERUPS →`}
            </button>

            {/* Skip option */}
            <button
                className="btn btn-ghost"
                onClick={() => router.push('/play')}
                style={{ width: '100%', marginTop: 'var(--space-2)', fontSize: 'var(--font-sm)' }}
            >
                SKIP — Play without powerups
            </button>
        </main>
    )
}
