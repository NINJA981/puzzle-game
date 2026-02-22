'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Team } from '@/lib/types'

export default function LeaderboardPage() {
    const [teams, setTeams] = useState<Team[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()

        async function fetchTeams() {
            const { data } = await supabase
                .from('teams')
                .select('*')
                .eq('status', 'ACTIVE')
                .order('completed_at', { ascending: true, nullsFirst: false })

            if (data) {
                const sorted = [
                    ...data.filter((t: { completed_at: string | null }) => t.completed_at),
                    ...data.filter((t: { completed_at: string | null }) => !t.completed_at).sort((a: { current_character_index: number }, b: { current_character_index: number }) => b.current_character_index - a.current_character_index),
                ]
                setTeams(sorted as Team[])
            }
            setLoading(false)
        }

        fetchTeams()

        const channel = supabase
            .channel('leaderboard')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, () => {
                fetchTeams()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    if (loading) {
        return (
            <main className="page-container flex-center">
                <div className="animate-pulse text-neon glow-text" style={{ fontSize: 'var(--font-xl)' }}>
                    LOADING...
                </div>
            </main>
        )
    }

    return (
        <main className="page-container">
            <div className="text-center mb-6 animate-fade-in-up">
                <h1
                    className="glow-text"
                    style={{ fontSize: 'var(--font-3xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}
                >
                    LEADERBOARD
                </h1>
                <p className="text-mono text-muted" style={{ fontSize: 'var(--font-sm)' }}>
                    REAL-TIME RANKINGS
                </p>
            </div>

            <div className="stagger-children">
                {teams.map((team, index) => {
                    const isCompleted = !!team.completed_at
                    const rank = index + 1

                    return (
                        <div
                            key={team.id}
                            className="card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-4)',
                                marginBottom: 'var(--space-3)',
                                border: rank <= 3 ? '1px solid var(--neon-primary)' : '1px solid var(--border-dim)',
                                boxShadow: rank <= 3 ? 'var(--glow-sm)' : 'none',
                            }}
                        >
                            {/* Rank */}
                            <div
                                className="text-mono"
                                style={{
                                    fontSize: rank <= 3 ? 'var(--font-xl)' : 'var(--font-lg)',
                                    fontWeight: 700,
                                    color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'var(--text-muted)',
                                    minWidth: 32,
                                    textAlign: 'center',
                                }}
                            >
                                {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                            </div>

                            {/* Team info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: 'var(--font-base)' }}>
                                    {team.team_name || `Team ${team.join_code}`}
                                </p>
                                <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                                    {isCompleted
                                        ? `Completed at ${new Date(team.completed_at!).toLocaleTimeString()}`
                                        : `Letter ${team.current_character_index} in progress`
                                    }
                                </p>
                            </div>

                            {/* Status */}
                            <span className={`badge ${isCompleted ? 'badge-success' : 'badge-warning'}`}>
                                {isCompleted ? 'DONE' : `${team.current_character_index}`}
                            </span>
                        </div>
                    )
                })}

                {teams.length === 0 && (
                    <div className="text-center text-muted" style={{ padding: 'var(--space-7)' }}>
                        <p className="text-mono">No teams yet</p>
                    </div>
                )}
            </div>
        </main>
    )
}
