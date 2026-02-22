'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Team, Puzzle } from '@/lib/types'

export default function TournamentPage() {
    const [teams, setTeams] = useState<Team[]>([])
    const [puzzles, setPuzzles] = useState<Puzzle[]>([])
    const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set())
    const [topN, setTopN] = useState('10')
    const [nextPuzzleId, setNextPuzzleId] = useState('')
    const [feedback, setFeedback] = useState('')
    const [loading, setLoading] = useState(true)
    const supabaseRef = useRef(createClient())

    useEffect(() => {
        fetchAll()
    }, [])

    async function fetchAll() {
        const supabase = supabaseRef.current
        const [teamsRes, puzzlesRes] = await Promise.all([
            supabase.from('teams').select('*').eq('status', 'ACTIVE').order('current_character_index', { ascending: false }),
            supabase.from('puzzles').select('*').order('round_number', { ascending: true }),
        ])
        if (teamsRes.data) setTeams(teamsRes.data as Team[])
        if (puzzlesRes.data) setPuzzles(puzzlesRes.data as Puzzle[])
        setLoading(false)
    }

    function showFeedback(msg: string) {
        setFeedback(msg)
        setTimeout(() => setFeedback(''), 4000)
    }

    function toggleTeam(id: string) {
        const next = new Set(selectedTeams)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedTeams(next)
    }

    function selectTopN() {
        const n = parseInt(topN) || 10
        const sorted = [...teams]
            .filter((t) => !!t.completed_at)
            .sort((a, b) => {
                const aTime = a.completed_at ? new Date(a.completed_at).getTime() : Infinity
                const bTime = b.completed_at ? new Date(b.completed_at).getTime() : Infinity
                return aTime - bTime
            })
        const ids = sorted.slice(0, n).map((t) => t.id)
        setSelectedTeams(new Set(ids))
    }

    async function handleAdvanceRound() {
        if (!nextPuzzleId) {
            showFeedback('❌ Select a puzzle for the next round')
            return
        }
        if (selectedTeams.size === 0) {
            showFeedback('❌ Select teams to advance')
            return
        }

        const res = await fetch('/api/admin/advance-round', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                team_ids: Array.from(selectedTeams),
                puzzle_id: nextPuzzleId,
            }),
        })

        if (res.ok) {
            const data = await res.json()
            showFeedback(`✅ Advanced ${data.qualified} teams. ${data.eliminated} eliminated.`)

            // Now start the round
            await fetch('/api/admin/start-round', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puzzle_id: nextPuzzleId }),
            })
            showFeedback(`✅ Round started with ${data.qualified} teams!`)
            fetchAll()
        } else {
            showFeedback('❌ Failed to advance round')
        }
    }

    if (loading) {
        return (
            <div className="flex-center" style={{ padding: 'var(--space-7)' }}>
                <div className="animate-pulse text-neon">Loading...</div>
            </div>
        )
    }

    const qualifiedTeams = teams.filter((t) => t.is_qualified)
    const eliminatedTeams = teams.filter((t) => !t.is_qualified)
    const completedTeams = qualifiedTeams.filter((t) => !!t.completed_at)

    return (
        <div>
            <div className="flex-between" style={{ marginBottom: 'var(--space-5)' }}>
                <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700 }}>Tournament</h1>
                {feedback && (
                    <span className="badge badge-success animate-fade-in-up" style={{ fontSize: 'var(--font-sm)', padding: 'var(--space-2) var(--space-3)' }}>
                        {feedback}
                    </span>
                )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
                    <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>QUALIFIED</p>
                    <p className="text-mono" style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--neon-success)' }}>{qualifiedTeams.length}</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
                    <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>COMPLETED</p>
                    <p className="text-mono" style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--neon-primary)' }}>{completedTeams.length}</p>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
                    <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>ELIMINATED</p>
                    <p className="text-mono" style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--neon-danger)' }}>{eliminatedTeams.length}</p>
                </div>
            </div>

            {/* Advance Round Controls */}
            <div className="card card-glow" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-5)' }}>
                <h2 className="text-mono" style={{ fontSize: 'var(--font-base)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                    🏆 Advance to Next Round
                </h2>

                {/* Next puzzle selector */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                        Next Round Puzzle
                    </label>
                    <select
                        className="input"
                        value={nextPuzzleId}
                        onChange={(e) => setNextPuzzleId(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        <option value="">Select puzzle...</option>
                        {puzzles.filter((p) => !p.is_active).map((p) => (
                            <option key={p.id} value={p.id}>{p.round_name} (Round #{p.round_number})</option>
                        ))}
                    </select>
                </div>

                {/* Quick select */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end', marginBottom: 'var(--space-4)' }}>
                    <div>
                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                            Auto-Select Top
                        </label>
                        <input type="number" className="input" value={topN} onChange={(e) => setTopN(e.target.value)} min="1" style={{ width: 70 }} />
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={selectTopN}>SELECT TOP {topN}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTeams(new Set())}>CLEAR</button>
                    <span className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                        {selectedTeams.size} selected
                    </span>
                </div>

                {/* Advance button */}
                <button
                    className="btn btn-primary"
                    onClick={handleAdvanceRound}
                    disabled={!nextPuzzleId || selectedTeams.size === 0}
                    style={{ width: '100%' }}
                >
                    🚀 ADVANCE {selectedTeams.size} TEAMS TO NEXT ROUND
                </button>
            </div>

            {/* Team Selection Table */}
            <h2 className="text-mono" style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                Team Selection
            </h2>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-sm)' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                            {['Select', 'Team', 'Progress', 'Hints Used', 'Status'].map((h) => (
                                <th key={h} style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', fontSize: 'var(--font-xs)' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {qualifiedTeams.map((team) => (
                            <tr
                                key={team.id}
                                onClick={() => toggleTeam(team.id)}
                                style={{
                                    borderBottom: '1px solid var(--border-dim)',
                                    cursor: 'pointer',
                                    background: selectedTeams.has(team.id) ? 'rgba(0, 255, 170, 0.05)' : 'transparent',
                                }}
                            >
                                <td style={{ padding: 'var(--space-3)' }}>
                                    <input type="checkbox" checked={selectedTeams.has(team.id)} onChange={() => toggleTeam(team.id)} />
                                </td>
                                <td style={{ padding: 'var(--space-3)', fontWeight: 600 }}>{team.team_name || team.join_code}</td>
                                <td style={{ padding: 'var(--space-3)' }}>{team.current_character_index} chars</td>
                                <td style={{ padding: 'var(--space-3)', color: 'var(--neon-warning)' }}>{team.hints_used_total || 0}</td>
                                <td style={{ padding: 'var(--space-3)' }}>
                                    <span className={`badge ${team.completed_at ? 'badge-success' : team.is_eliminated ? 'badge-danger' : 'badge-warning'}`}>
                                        {team.completed_at ? 'DONE' : team.is_eliminated ? 'OUT' : 'PLAYING'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Previously eliminated */}
            {eliminatedTeams.length > 0 && (
                <>
                    <h3 className="text-mono text-muted" style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-5)', marginBottom: 'var(--space-3)' }}>
                        Previously Eliminated ({eliminatedTeams.length})
                    </h3>
                    <div style={{ opacity: 0.5 }}>
                        {eliminatedTeams.map((team) => (
                            <div key={team.id} className="card" style={{ padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{team.team_name || team.join_code}</span>
                                <span className="badge badge-danger" style={{ fontSize: 'var(--font-xs)' }}>ELIMINATED</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
