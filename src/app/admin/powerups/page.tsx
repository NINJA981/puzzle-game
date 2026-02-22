'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Powerup } from '@/lib/types'

export default function AdminPowerupsPage() {
    const [powerups, setPowerups] = useState<Powerup[]>([])
    const [loading, setLoading] = useState(true)
    const [feedback, setFeedback] = useState('')
    const supabaseRef = useRef(createClient())

    useEffect(() => { fetchPowerups() }, [])

    async function fetchPowerups() {
        const supabase = supabaseRef.current
        const { data } = await supabase
            .from('powerups')
            .select('*')
            .order('name', { ascending: true })
        if (data) setPowerups(data as Powerup[])
        setLoading(false)
    }

    function showFeedback(msg: string) {
        setFeedback(msg)
        setTimeout(() => setFeedback(''), 3000)
    }

    async function toggleActive(powerup: Powerup) {
        const supabase = supabaseRef.current
        await supabase
            .from('powerups')
            .update({ is_active: !powerup.is_active })
            .eq('id', powerup.id)
        showFeedback(`${powerup.name} ${!powerup.is_active ? 'enabled' : 'disabled'}`)
        fetchPowerups()
    }

    if (loading) {
        return (
            <div className="flex-center" style={{ padding: 'var(--space-7)' }}>
                <div className="animate-pulse text-neon">Loading...</div>
            </div>
        )
    }

    const activeCount = powerups.filter((p) => p.is_active).length

    return (
        <div>
            <div className="flex-between" style={{ marginBottom: 'var(--space-5)' }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>Powerups</h1>
                    <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                        {activeCount} of {powerups.length} active
                    </p>
                </div>
                {feedback && (
                    <span className="badge badge-success animate-fade-in-up" style={{ fontSize: 'var(--font-sm)', padding: 'var(--space-2) var(--space-3)' }}>
                        {feedback}
                    </span>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
                {powerups.map((p) => (
                    <div
                        key={p.id}
                        className="card"
                        style={{
                            padding: 'var(--space-4)',
                            opacity: p.is_active ? 1 : 0.4,
                            border: p.is_active ? '1px solid var(--neon-primary)' : '1px solid var(--border-dim)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                            <span style={{ fontSize: '2rem' }}>{p.icon}</span>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 700, fontSize: 'var(--font-base)' }}>{p.name}</p>
                                <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>{p.slug}</p>
                            </div>
                            <span className={`badge ${p.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 'var(--font-xs)' }}>
                                {p.is_active ? 'ON' : 'OFF'}
                            </span>
                        </div>

                        <p className="text-muted" style={{ fontSize: 'var(--font-sm)', marginBottom: 'var(--space-3)' }}>
                            {p.description}
                        </p>

                        <div className="text-mono" style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)', padding: 'var(--space-2)', background: 'var(--bg-elevated)', borderRadius: 4 }}>
                            Effect: {JSON.stringify(p.effect)}
                        </div>

                        <button
                            className={`btn ${p.is_active ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                            onClick={() => toggleActive(p)}
                            style={{ width: '100%' }}
                        >
                            {p.is_active ? 'DISABLE' : 'ENABLE'}
                        </button>
                    </div>
                ))}
            </div>

            {powerups.length === 0 && (
                <p className="text-muted text-mono" style={{ textAlign: 'center', padding: 'var(--space-7)' }}>
                    No powerups found. Run the SQL migration to seed defaults.
                </p>
            )}
        </div>
    )
}
