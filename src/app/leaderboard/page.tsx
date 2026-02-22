'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Team } from '@/lib/types'
import { formatDuration } from '@/lib/utils'

interface LeaderboardTeam extends Team {
    score: number
    time_seconds: number
}

export default function LeaderboardPage() {
    const [teams, setTeams] = useState<LeaderboardTeam[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()

        async function fetchLeaderboard() {
            // Try the leaderboard table first (end-game calculated scores)
            const { data: lbData } = await supabase
                .from('leaderboard')
                .select('*, team:teams(*)')
                .order('rank', { ascending: true })

            if (lbData && lbData.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mapped = lbData.map((entry: any) => ({
                    ...(entry.team || {}),
                    score: entry.score,
                    time_seconds: entry.time_seconds,
                    hints_used_total: entry.hints_used,
                })) as LeaderboardTeam[]
                setTeams(mapped)
                setLoading(false)
                return
            }

            // Fallback: live calculation from teams table
            const { data } = await supabase
                .from('teams')
                .select('*')
                .eq('status', 'ACTIVE')

            if (data) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const scored = (data as any[]).map((team) => {
                    const startTime = team.round_start_time ? new Date(team.round_start_time).getTime() : 0
                    const endTime = team.completed_at ? new Date(team.completed_at).getTime() : Date.now()
                    const timeSec = startTime > 0 ? Math.floor((endTime - startTime) / 1000) : 9999
                    const hints = team.hints_used_total || 0
                    const isComplete = !!team.completed_at

                    let hintMultiplier = 1.0
                    if (hints === 0) hintMultiplier = 1.5
                    else if (hints <= 2) hintMultiplier = 1.2
                    else if (hints <= 4) hintMultiplier = 1.0
                    else hintMultiplier = 0.8

                    const score = isComplete ? Math.round(((1 / timeSec) * 10000 * hintMultiplier) * 100) / 100 : 0

                    return { ...team, score, time_seconds: timeSec } as LeaderboardTeam
                })

                scored.sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score
                    return a.time_seconds - b.time_seconds
                })

                setTeams(scored)
            }
            setLoading(false)
        }

        fetchLeaderboard()

        const channel = supabase
            .channel('leaderboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchLeaderboard())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => fetchLeaderboard())
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
                <h1 className="glow-text" style={{ fontSize: 'var(--font-3xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                    LEADERBOARD
                </h1>
                <p className="text-mono text-muted" style={{ fontSize: 'var(--font-sm)' }}>
                    REAL-TIME RANKINGS
                </p>
            </div>

            {/* Podium for top 3 */}
            {teams.length >= 3 && (
                <div className="animate-fade-in-up" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', padding: 'var(--space-4) 0' }}>
                    {/* 2nd */}
                    <div style={{ textAlign: 'center', flex: 1, maxWidth: 160 }}>
                        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-1)' }}>🥈</div>
                        <p className="text-mono" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: '#c0c0c0' }}>
                            {teams[1].team_name || `Team ${teams[1].join_code}`}
                        </p>
                        <div className="card" style={{ padding: 'var(--space-3)', marginTop: 'var(--space-2)', background: 'rgba(192,192,192,0.05)', border: '1px solid rgba(192,192,192,0.3)' }}>
                            <p className="text-mono" style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{teams[1].score}</p>
                            <p className="text-muted" style={{ fontSize: 'var(--font-xs)' }}>{formatDuration(teams[1].time_seconds)}</p>
                        </div>
                    </div>
                    {/* 1st */}
                    <div style={{ textAlign: 'center', flex: 1, maxWidth: 180 }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-1)' }}>🥇</div>
                        <p className="text-mono" style={{ fontSize: 'var(--font-base)', fontWeight: 700, color: '#ffd700' }}>
                            {teams[0].team_name || `Team ${teams[0].join_code}`}
                        </p>
                        <div className="card card-glow" style={{ padding: 'var(--space-4)', marginTop: 'var(--space-2)', border: '1px solid rgba(255,215,0,0.4)' }}>
                            <p className="text-mono" style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: '#ffd700' }}>{teams[0].score}</p>
                            <p className="text-muted" style={{ fontSize: 'var(--font-xs)' }}>{formatDuration(teams[0].time_seconds)}</p>
                        </div>
                    </div>
                    {/* 3rd */}
                    <div style={{ textAlign: 'center', flex: 1, maxWidth: 160 }}>
                        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-1)' }}>🥉</div>
                        <p className="text-mono" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: '#cd7f32' }}>
                            {teams[2].team_name || `Team ${teams[2].join_code}`}
                        </p>
                        <div className="card" style={{ padding: 'var(--space-3)', marginTop: 'var(--space-2)', background: 'rgba(205,127,50,0.05)', border: '1px solid rgba(205,127,50,0.3)' }}>
                            <p className="text-mono" style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{teams[2].score}</p>
                            <p className="text-muted" style={{ fontSize: 'var(--font-xs)' }}>{formatDuration(teams[2].time_seconds)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Full list */}
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
                                opacity: team.is_eliminated ? 0.4 : 1,
                            }}
                        >
                            {/* Rank */}
                            <div className="text-mono" style={{
                                fontSize: rank <= 3 ? 'var(--font-xl)' : 'var(--font-lg)',
                                fontWeight: 700,
                                color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : 'var(--text-muted)',
                                minWidth: 36,
                                textAlign: 'center',
                            }}>
                                {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: 'var(--font-base)' }}>
                                    {team.team_name || `Team ${team.join_code}`}
                                </p>
                                <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                                    {isCompleted
                                        ? `${formatDuration(team.time_seconds)} • ${team.hints_used_total || 0} hints`
                                        : team.is_eliminated
                                            ? 'Eliminated'
                                            : `Letter ${team.current_character_index} in progress`
                                    }
                                </p>
                            </div>

                            {/* Score */}
                            <div style={{ textAlign: 'right' }}>
                                <p className="text-mono" style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: isCompleted ? 'var(--neon-success)' : 'var(--text-muted)' }}>
                                    {team.score || 0}
                                </p>
                                <span className={`badge ${isCompleted ? 'badge-success' : team.is_eliminated ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: 'var(--font-xs)' }}>
                                    {isCompleted ? 'DONE' : team.is_eliminated ? 'OUT' : 'PLAYING'}
                                </span>
                            </div>
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
