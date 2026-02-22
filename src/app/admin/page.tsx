'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Puzzle } from '@/lib/types'

export default function AdminDashboard() {
    const [stats, setStats] = useState({ total: 0, active: 0, unused: 0, completed: 0 })
    const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null)
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    useEffect(() => {
        async function fetchStats() {
            const { data: teams } = await supabase.from('teams').select('status, completed_at')

            if (teams) {
                setStats({
                    total: teams.length,
                    active: teams.filter((t: { status: string }) => t.status === 'ACTIVE').length,
                    unused: teams.filter((t: { status: string }) => t.status === 'UNUSED').length,
                    completed: teams.filter((t: { completed_at: string | null }) => t.completed_at).length,
                })
            }

            const { data: puzzle } = await supabase
                .from('puzzles')
                .select('*')
                .eq('is_active', true)
                .single()

            if (puzzle) setActivePuzzle(puzzle)
        }

        fetchStats()
    }, [supabase])

    const statCards = [
        { label: 'Total Codes', value: stats.total, color: 'var(--neon-secondary)' },
        { label: 'Active Teams', value: stats.active, color: 'var(--neon-primary)' },
        { label: 'Unused Codes', value: stats.unused, color: 'var(--neon-warning)' },
        { label: 'Completed', value: stats.completed, color: 'var(--neon-success)' },
    ]

    return (
        <div>
            <h1
                style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}
            >
                Dashboard
            </h1>

            {/* Stats Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-6)',
                }}
            >
                {statCards.map((stat) => (
                    <div key={stat.label} className="card" style={{ borderLeft: `3px solid ${stat.color}` }}>
                        <p
                            className="text-mono text-muted"
                            style={{ fontSize: 'var(--font-xs)', textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}
                        >
                            {stat.label}
                        </p>
                        <p
                            className="text-mono"
                            style={{
                                fontSize: 'var(--font-2xl)',
                                fontWeight: 700,
                                color: stat.color,
                            }}
                        >
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Active Puzzle */}
            <div className="card card-glow">
                <h2
                    className="text-mono"
                    style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}
                >
                    Active Round
                </h2>
                {activePuzzle ? (
                    <div>
                        <p>
                            <span className="text-muted text-mono" style={{ fontSize: 'var(--font-sm)' }}>Name: </span>
                            <span className="text-neon">{activePuzzle.round_name}</span>
                        </p>
                        <p>
                            <span className="text-muted text-mono" style={{ fontSize: 'var(--font-sm)' }}>Round: </span>
                            <span>#{activePuzzle.round_number}</span>
                        </p>
                        <p>
                            <span className="text-muted text-mono" style={{ fontSize: 'var(--font-sm)' }}>Password Length: </span>
                            <span>{activePuzzle.master_password.length} chars</span>
                        </p>
                        <p>
                            <span className="text-muted text-mono" style={{ fontSize: 'var(--font-sm)' }}>Status: </span>
                            <span className={`badge ${activePuzzle.is_live ? 'badge-success' : 'badge-warning'}`}>
                                {activePuzzle.is_live ? 'LIVE' : 'NOT STARTED'}
                            </span>
                        </p>
                    </div>
                ) : (
                    <p className="text-muted">No active round. Create a puzzle and set it as active.</p>
                )}
            </div>
        </div>
    )
}
