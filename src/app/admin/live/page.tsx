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
    const [confirmAction, setConfirmAction] = useState<string | null>(null)
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    useEffect(() => {
        fetchData()
        const channel = supabase
            .channel('admin_live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchTeams())
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [])

    async function fetchData() {
        await Promise.all([fetchTeams(), fetchPuzzles()])
        setLoading(false)
    }

    async function fetchTeams() {
        const { data } = await supabase.from('teams').select('*').in('status', ['ACTIVE', 'UNUSED']).order('current_character_index', { ascending: false })
        if (data) setTeams(data as Team[])
    }

    async function fetchPuzzles() {
        const { data } = await supabase.from('puzzles').select('*').order('round_number', { ascending: true })
        if (data) {
            setPuzzles(data as Puzzle[])
            setActivePuzzle((data as Puzzle[]).find((p) => p.is_active) || null)
        }
    }

    function showFeedback(msg: string) {
        setActionFeedback(msg)
        setTimeout(() => setActionFeedback(''), 4000)
    }

    async function handleStartRound(puzzleId: string) {
        const res = await fetch('/api/admin/start-round', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ puzzle_id: puzzleId }) })
        if (res.ok) { showFeedback('🚀 Round started!'); fetchData() }
    }

    async function handleEndGame() {
        const res = await fetch('/api/admin/end-game', { method: 'POST' })
        if (res.ok) { showFeedback('🏁 Game ended! Leaderboard calculated.'); fetchData() }
        setConfirmAction(null)
    }

    async function handleResetGame() {
        const res = await fetch('/api/admin/reset-game', { method: 'POST' })
        if (res.ok) { showFeedback('🔄 Game reset. All progress cleared.'); fetchData() }
        setConfirmAction(null)
    }

    async function handleDeleteCodes(unusedOnly: boolean) {
        const res = await fetch('/api/admin/delete-codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ unused_only: unusedOnly }) })
        if (res.ok) { showFeedback(unusedOnly ? '🗑️ Unused codes deleted.' : '🗑️ All codes deleted.'); fetchData() }
        setConfirmAction(null)
    }

    async function handleGrantExtraLife() {
        const res = await fetch('/api/admin/grant-extra-life', { method: 'POST' })
        if (res.ok) {
            const data = await res.json()
            showFeedback(`❤️ Revived ${data.revived} teams!`)
            fetchTeams()
        }
    }

    async function handleResetSession(teamId: string) {
        const res = await fetch('/api/admin/reset-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: teamId }) })
        if (res.ok) { showFeedback('Session reset.'); fetchTeams() }
    }

    async function handleBypass(teamId: string) {
        const res = await fetch('/api/admin/bypass', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: teamId }) })
        if (res.ok) { showFeedback('Bypassed — team advanced.'); fetchTeams() }
    }

    async function handleKickRegenerate(teamId: string) {
        const res = await fetch('/api/admin/kick-regenerate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: teamId }) })
        if (res.ok) {
            const data = await res.json()
            showFeedback(`Kicked & regenerated: ${data.new_code}`)
            fetchTeams()
        }
    }

    async function handleGrantHints() {
        const res = await fetch('/api/admin/grant-hints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseInt(hintsAmount) }) })
        if (res.ok) {
            const data = await res.json()
            showFeedback(`+${data.tokens_added} hints to ${data.teams_updated} teams.`)
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

    const activeTeams = teams.filter((t) => t.status === 'ACTIVE')
    const eliminatedTeams = activeTeams.filter((t) => t.is_eliminated)
    const playingTeams = activeTeams.filter((t) => !t.is_eliminated && !t.completed_at)
    const completedTeams = activeTeams.filter((t) => !!t.completed_at)

    return (
        <div>
            <div className="flex-between" style={{ marginBottom: 'var(--space-6)' }}>
                <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>Live Control</h1>
                {actionFeedback && (
                    <span className="badge badge-success animate-fade-in-up" style={{ fontSize: 'var(--font-sm)', padding: 'var(--space-2) var(--space-3)' }}>
                        {actionFeedback}
                    </span>
                )}
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                {[
                    { label: 'PLAYING', value: playingTeams.length, color: 'var(--neon-primary)' },
                    { label: 'COMPLETED', value: completedTeams.length, color: 'var(--neon-success)' },
                    { label: 'ELIMINATED', value: eliminatedTeams.length, color: 'var(--neon-danger)' },
                    { label: 'TOTAL', value: activeTeams.length, color: 'var(--neon-secondary)' },
                ].map((stat) => (
                    <div key={stat.label} className="card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
                        <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>{stat.label}</p>
                        <p className="text-mono" style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: stat.color }}>{stat.value}</p>
                    </div>
                ))}
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
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            {!activePuzzle.is_live && (
                                <button className="btn btn-primary" onClick={() => handleStartRound(activePuzzle.id)}>
                                    🚀 START ROUND
                                </button>
                            )}
                            {activePuzzle.is_live && (
                                <button className="btn btn-danger" onClick={() => setConfirmAction('end')}>
                                    🏁 END GAME
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-muted mb-3">Select a round to start:</p>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            {puzzles.map((p) => (
                                <button key={p.id} className="btn btn-ghost btn-sm" onClick={() => handleStartRound(p.id)}>
                                    {p.round_name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                {/* Grant Hints */}
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <h3 className="text-mono" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                        💡 Grant Hints
                    </h3>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                        <input type="number" className="input" value={hintsAmount} onChange={(e) => setHintsAmount(e.target.value)} min="1" max="10" style={{ width: 60 }} />
                        <button className="btn btn-secondary btn-sm" onClick={handleGrantHints}>GRANT</button>
                    </div>
                </div>

                {/* Extra Life */}
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <h3 className="text-mono" style={{ fontSize: 'var(--font-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                        ❤️ Extra Life
                    </h3>
                    <p className="text-muted" style={{ fontSize: 'var(--font-xs)', marginBottom: 'var(--space-2)' }}>
                        Revive {eliminatedTeams.length} eliminated teams
                    </p>
                    <button className="btn btn-secondary btn-sm" onClick={handleGrantExtraLife} disabled={eliminatedTeams.length === 0}>
                        REVIVE ALL
                    </button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="card" style={{ marginBottom: 'var(--space-5)', borderColor: 'var(--neon-danger)' }}>
                <h2 className="text-mono" style={{ fontSize: 'var(--font-base)', fontWeight: 600, marginBottom: 'var(--space-3)', color: 'var(--neon-danger)' }}>
                    ⚠️ Danger Zone
                </h2>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmAction('reset')}>🔄 Reset Game</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmAction('delete-unused')}>🗑️ Delete Unused Codes</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmAction('delete-all')}>💣 Delete ALL Codes</button>
                </div>

                {/* Confirm dialog */}
                {confirmAction && (
                    <div className="animate-fade-in-up" style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(255,0,0,0.1)', borderRadius: 6 }}>
                        <p className="text-mono" style={{ fontSize: 'var(--font-sm)', marginBottom: 'var(--space-2)' }}>
                            Are you sure? This cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    if (confirmAction === 'reset') handleResetGame()
                                    else if (confirmAction === 'delete-unused') handleDeleteCodes(true)
                                    else if (confirmAction === 'delete-all') handleDeleteCodes(false)
                                    else if (confirmAction === 'end') handleEndGame()
                                }}
                            >
                                CONFIRM
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmAction(null)}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Live Team Table */}
            <h2 className="text-mono" style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                Teams ({activeTeams.length} active)
            </h2>

            {activeTeams.length === 0 ? (
                <p className="text-muted">No active teams.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-sm)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                {['Team', 'Code', 'Progress', 'Hints', 'Status', 'Actions'].map((h) => (
                                    <th key={h} style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', fontSize: 'var(--font-xs)' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activeTeams.map((team) => (
                                <tr key={team.id} style={{ borderBottom: '1px solid var(--border-dim)', opacity: team.is_eliminated ? 0.5 : 1 }}>
                                    <td style={{ padding: 'var(--space-3)' }}>{team.team_name || '—'}</td>
                                    <td style={{ padding: 'var(--space-3)', color: 'var(--neon-secondary)' }}>{team.join_code}</td>
                                    <td style={{ padding: 'var(--space-3)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <div style={{ width: 80, height: 6, background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: activePuzzle ? `${(team.current_character_index / activePuzzle.master_password.length) * 100}%` : '0%',
                                                    height: '100%',
                                                    background: team.completed_at ? 'var(--neon-success)' : team.is_eliminated ? 'var(--neon-danger)' : 'var(--neon-primary)',
                                                    transition: 'width 0.3s ease',
                                                }} />
                                            </div>
                                            <span className="text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                                                {team.current_character_index}{activePuzzle ? `/${activePuzzle.master_password.length}` : ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', color: 'var(--neon-warning)' }}>{team.hint_tokens}</td>
                                    <td style={{ padding: 'var(--space-3)' }}>
                                        <span className={`badge ${team.completed_at ? 'badge-success' : team.is_eliminated ? 'badge-danger' : 'badge-info'}`}>
                                            {team.completed_at ? 'DONE' : team.is_eliminated ? 'ELIMINATED' : 'PLAYING'}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--space-3)' }}>
                                        <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleResetSession(team.id)} title="Reset session">↻</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleBypass(team.id)} title="Bypass clue">⏭</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleKickRegenerate(team.id)} title="Kick & regen">✕</button>
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
