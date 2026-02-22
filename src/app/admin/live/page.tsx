'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Team, Puzzle } from '@/lib/types'

export default function LiveControlPage() {
    const [teams, setTeams] = useState<Team[]>([])
    const [puzzles, setPuzzles] = useState<Puzzle[]>([])
    const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null)
    const [hintsAmount, setHintsAmount] = useState('1')
    const [actionFeedback, setActionFeedback] = useState('')
    const [loading, setLoading] = useState(true)
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    useEffect(() => {
        fetchData()

        // Real-time subscription for teams
        const channel = supabase
            .channel('admin_live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
                fetchTeams()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    async function fetchData() {
        await Promise.all([fetchTeams(), fetchPuzzles()])
        setLoading(false)
    }

    async function fetchTeams() {
        const { data } = await supabase
            .from('teams')
            .select('*')
            .eq('status', 'ACTIVE')
            .order('current_character_index', { ascending: false })

        if (data) setTeams(data)
    }

    async function fetchPuzzles() {
        const { data } = await supabase
            .from('puzzles')
            .select('*')
            .order('round_number', { ascending: true })

        if (data) {
            setPuzzles(data)
            setActivePuzzle(data.find((p: Puzzle) => p.is_active) || null)
        }
    }

    function showFeedback(msg: string) {
        setActionFeedback(msg)
        setTimeout(() => setActionFeedback(''), 3000)
    }

    async function handleStartRound(puzzleId: string) {
        const res = await fetch('/api/admin/start-round', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ puzzle_id: puzzleId }),
        })
        if (res.ok) {
            showFeedback('Round started! Players have been notified.')
            fetchData()
        }
    }

    async function handleResetSession(teamId: string) {
        const res = await fetch('/api/admin/reset-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_id: teamId }),
        })
        if (res.ok) {
            showFeedback('Session reset — team can re-login.')
            fetchTeams()
        }
    }

    async function handleKickRegenerate(teamId: string) {
        const res = await fetch('/api/admin/kick-regenerate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_id: teamId }),
        })
        if (res.ok) {
            const data = await res.json()
            showFeedback(`Code regenerated: ${data.new_code}`)
            fetchTeams()
        }
    }

    async function handleBypass(teamId: string) {
        const res = await fetch('/api/admin/bypass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team_id: teamId }),
        })
        if (res.ok) {
            showFeedback('Bypassed — team advanced to next letter.')
            fetchTeams()
        }
    }

    async function handleGrantHints() {
        const res = await fetch('/api/admin/grant-hints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: parseInt(hintsAmount) }),
        })
        if (res.ok) {
            const data = await res.json()
            showFeedback(`+${data.tokens_added} hints granted to ${data.teams_updated} teams.`)
            fetchTeams()
        }
    }

    if (loading) {
        return (
            <div className="flex-center" style={{ padding: 'var(--space-7)' }}>
                <div className="animate-pulse text-neon">Loading...</div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex-between" style={{ marginBottom: 'var(--space-6)' }}>
                <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>
                    Live Control
                </h1>
                {actionFeedback && (
                    <span
                        className="badge badge-success animate-fade-in-up"
                        style={{ fontSize: 'var(--font-sm)', padding: 'var(--space-2) var(--space-3)' }}
                    >
                        {actionFeedback}
                    </span>
                )}
            </div>

            {/* Round Controls */}
            <div className="card card-glow" style={{ marginBottom: 'var(--space-5)' }}>
                <h2 className="text-mono" style={{ fontSize: 'var(--font-base)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                    Round Control
                </h2>

                {activePuzzle ? (
                    <div className="flex-between">
                        <div>
                            <p className="text-neon" style={{ fontWeight: 600 }}>{activePuzzle.round_name}</p>
                            <p className="text-muted text-mono" style={{ fontSize: 'var(--font-xs)' }}>
                                {activePuzzle.is_live ? '● LIVE' : '○ Not started'}
                            </p>
                        </div>
                        {!activePuzzle.is_live && (
                            <button
                                className="btn btn-primary"
                                onClick={() => handleStartRound(activePuzzle.id)}
                            >
                                🚀 START ROUND
                            </button>
                        )}
                    </div>
                ) : (
                    <div>
                        <p className="text-muted mb-3">Select a round to start:</p>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            {puzzles.map((p) => (
                                <button
                                    key={p.id}
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleStartRound(p.id)}
                                >
                                    {p.round_name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Grant Hints */}
            <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
                <h2 className="text-mono" style={{ fontSize: 'var(--font-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                    Grant Hints to All Teams
                </h2>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
                    <div>
                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                            Tokens
                        </label>
                        <input
                            type="number"
                            className="input"
                            value={hintsAmount}
                            onChange={(e) => setHintsAmount(e.target.value)}
                            min="1"
                            max="10"
                            style={{ width: 80 }}
                        />
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={handleGrantHints}>
                        💡 GRANT HINTS
                    </button>
                </div>
            </div>

            {/* Live Leaderboard */}
            <h2 className="text-mono" style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                Live Leaderboard ({teams.length} active)
            </h2>

            {teams.length === 0 ? (
                <p className="text-muted">No active teams.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-sm)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                {['Team', 'Code', 'Progress', 'Hints', 'Status', 'Actions'].map((h) => (
                                    <th
                                        key={h}
                                        style={{
                                            padding: 'var(--space-3)',
                                            textAlign: 'left',
                                            color: 'var(--text-muted)',
                                            fontWeight: 500,
                                            textTransform: 'uppercase',
                                            fontSize: 'var(--font-xs)',
                                        }}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map((team) => (
                                <tr key={team.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                    <td style={{ padding: 'var(--space-3)' }}>
                                        {team.team_name || '—'}
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', color: 'var(--neon-secondary)' }}>
                                        {team.join_code}
                                    </td>
                                    <td style={{ padding: 'var(--space-3)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <div
                                                style={{
                                                    width: 80,
                                                    height: 6,
                                                    background: 'var(--bg-elevated)',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: activePuzzle
                                                            ? `${(team.current_character_index / activePuzzle.master_password.length) * 100}%`
                                                            : '0%',
                                                        height: '100%',
                                                        background: team.completed_at ? 'var(--neon-success)' : 'var(--neon-primary)',
                                                        transition: 'width 0.3s ease',
                                                    }}
                                                />
                                            </div>
                                            <span className="text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                                                {team.current_character_index}
                                                {activePuzzle ? `/${activePuzzle.master_password.length}` : ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', color: 'var(--neon-warning)' }}>
                                        {team.hint_tokens}
                                    </td>
                                    <td style={{ padding: 'var(--space-3)' }}>
                                        <span className={`badge ${team.completed_at ? 'badge-success' : 'badge-info'}`}>
                                            {team.completed_at ? 'DONE' : 'PLAYING'}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--space-3)' }}>
                                        <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleResetSession(team.id)}
                                                title="Reset session — allow re-login"
                                            >
                                                ↻
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleBypass(team.id)}
                                                title="Bypass — skip current clue"
                                            >
                                                ⏭
                                            </button>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleKickRegenerate(team.id)}
                                                title="Kick & regenerate code"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
