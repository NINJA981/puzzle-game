'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Puzzle } from '@/lib/types'

interface ClueInput {
    character_position: number
    clue_text: string
    hint_text: string
    expected_answer: string
    max_tries: number
    lockout_duration_seconds: number
}

export default function PuzzlesPage() {
    const [puzzles, setPuzzles] = useState<(Puzzle & { clues: unknown[] })[]>([])
    const [roundNumber, setRoundNumber] = useState(1)
    const [roundName, setRoundName] = useState('')
    const [masterPassword, setMasterPassword] = useState('')
    const [clues, setClues] = useState<ClueInput[]>([])
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    useEffect(() => {
        fetchPuzzles()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function fetchPuzzles() {
        const res = await fetch('/api/admin/puzzles')
        const data = await res.json()
        if (data.puzzles) setPuzzles(data.puzzles)
    }

    useEffect(() => {
        if (!masterPassword) {
            setClues([])
            return
        }

        const newClues: ClueInput[] = masterPassword.split('').map((char, i) => ({
            character_position: i,
            clue_text: '',
            hint_text: '',
            expected_answer: char.toUpperCase(),
            max_tries: 3,
            lockout_duration_seconds: 30,
        }))

        setClues((prev) => {
            return newClues.map((nc, i) => ({
                ...nc,
                clue_text: prev[i]?.clue_text || '',
                hint_text: prev[i]?.hint_text || '',
                max_tries: prev[i]?.max_tries ?? 3,
                lockout_duration_seconds: prev[i]?.lockout_duration_seconds ?? 30,
            }))
        })
    }, [masterPassword])

    function updateClue(index: number, field: keyof ClueInput, value: string | number) {
        setClues((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
    }

    async function handleSave() {
        if (!masterPassword || clues.some((c) => !c.clue_text)) {
            setMessage('Fill in all clue texts before saving.')
            return
        }

        setSaving(true)
        setMessage('')

        try {
            const res = await fetch('/api/admin/puzzles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    round_number: roundNumber,
                    round_name: roundName || `Round ${roundNumber}`,
                    master_password: masterPassword.toUpperCase(),
                    clues,
                }),
            })

            if (res.ok) {
                setMessage('Puzzle created successfully!')
                setMasterPassword('')
                setRoundName('')
                setRoundNumber((prev) => prev + 1)
                setClues([])
                fetchPuzzles()
            } else {
                const data = await res.json()
                setMessage(data.error || 'Failed to create puzzle')
            }
        } catch {
            setMessage('Connection error')
        } finally {
            setSaving(false)
        }
    }

    async function handleSetActive(puzzleId: string) {
        await supabase.from('puzzles').update({ is_active: false }).neq('id', puzzleId)
        await supabase.from('puzzles').update({ is_active: true }).eq('id', puzzleId)
        fetchPuzzles()
    }

    return (
        <div>
            <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
                Puzzle Creator
            </h1>

            {/* Creator Form */}
            <div className="card card-glow" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 className="text-mono" style={{ fontSize: 'var(--font-base)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                    Create New Round
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    <div>
                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>
                            Round #
                        </label>
                        <input
                            type="number"
                            className="input"
                            value={roundNumber}
                            onChange={(e) => setRoundNumber(parseInt(e.target.value) || 1)}
                            min="1"
                        />
                    </div>
                    <div>
                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>
                            Round Name
                        </label>
                        <input
                            type="text"
                            className="input"
                            value={roundName}
                            onChange={(e) => setRoundName(e.target.value)}
                            placeholder="e.g. The Cipher"
                        />
                    </div>
                    <div>
                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>
                            Master Password
                        </label>
                        <input
                            type="text"
                            className="input"
                            value={masterPassword}
                            onChange={(e) => setMasterPassword(e.target.value)}
                            placeholder="Type the secret word..."
                            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase' }}
                        />
                    </div>
                </div>

                {/* Dynamic Clue Blocks */}
                {clues.length > 0 && (
                    <div>
                        <p className="text-mono text-muted mb-3" style={{ fontSize: 'var(--font-xs)', textTransform: 'uppercase' }}>
                            {clues.length} CHARACTERS — DEFINE CLUES FOR EACH LETTER
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {clues.map((clue, i) => (
                                <div
                                    key={i}
                                    className="card"
                                    style={{ border: '1px solid var(--border-dim)', padding: 'var(--space-4)' }}
                                >
                                    <div className="flex-between mb-3">
                                        <span className="badge badge-info">
                                            LETTER {i + 1}: &quot;{clue.expected_answer}&quot;
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                                        <div>
                                            <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                                                Clue Text *
                                            </label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={clue.clue_text}
                                                onChange={(e) => updateClue(i, 'clue_text', e.target.value)}
                                                placeholder="What's the capital of France?"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                                                Hint Text
                                            </label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={clue.hint_text}
                                                onChange={(e) => updateClue(i, 'hint_text', e.target.value)}
                                                placeholder="Think about the Eiffel Tower..."
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                        <div>
                                            <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                                                Max Tries
                                            </label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={clue.max_tries}
                                                onChange={(e) => updateClue(i, 'max_tries', parseInt(e.target.value) || 3)}
                                                min="1"
                                                max="10"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                                                Lockout Duration (seconds)
                                            </label>
                                            <input
                                                type="number"
                                                className="input"
                                                value={clue.lockout_duration_seconds}
                                                onChange={(e) => updateClue(i, 'lockout_duration_seconds', parseInt(e.target.value) || 30)}
                                                min="5"
                                                max="300"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {message && (
                            <p
                                className="text-mono mt-auto"
                                style={{
                                    fontSize: 'var(--font-sm)',
                                    marginTop: 'var(--space-4)',
                                    color: message.includes('success') ? 'var(--neon-success)' : 'var(--neon-danger)',
                                }}
                            >
                                {message}
                            </p>
                        )}

                        <button
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%', marginTop: 'var(--space-4)' }}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'SAVING...' : 'CREATE PUZZLE'}
                        </button>
                    </div>
                )}
            </div>

            {/* Existing Puzzles */}
            <h2 className="text-mono" style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                Existing Rounds
            </h2>

            {puzzles.length === 0 ? (
                <p className="text-muted">No puzzles created yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {puzzles.map((puzzle) => (
                        <div
                            key={puzzle.id}
                            className="card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                border: puzzle.is_active ? '1px solid var(--neon-primary)' : undefined,
                                boxShadow: puzzle.is_active ? 'var(--glow-sm)' : undefined,
                            }}
                        >
                            <div>
                                <p style={{ fontWeight: 600 }}>
                                    {puzzle.round_name}
                                    {puzzle.is_active && <span className="badge badge-success" style={{ marginLeft: 'var(--space-2)' }}>ACTIVE</span>}
                                </p>
                                <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                                    Round #{puzzle.round_number} · {puzzle.master_password.length} letters · {puzzle.clues?.length || 0} clues
                                </p>
                            </div>
                            {!puzzle.is_active && (
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleSetActive(puzzle.id)}
                                >
                                    SET ACTIVE
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
