'use client'

import { useEffect, useState } from 'react'

interface ClueInput {
    character_position: number
    clue_text: string
    hint_1: string
    hint_2: string
    hint_3: string
    image_url: string
    expected_answer: string
    max_tries: number
    lockout_duration_seconds: number
}

interface PuzzleData {
    id: string
    round_number: number
    round_name: string
    master_password: string
    is_active: boolean
    is_live: boolean
    max_powerups: number
    max_hints: number
    clues?: ClueInput[]
}

export default function PuzzlesPage() {
    const [puzzles, setPuzzles] = useState<PuzzleData[]>([])
    const [roundNumber, setRoundNumber] = useState('1')
    const [roundName, setRoundName] = useState('')
    const [masterPassword, setMasterPassword] = useState('')
    const [clues, setClues] = useState<ClueInput[]>([])
    const [maxPowerups, setMaxPowerups] = useState('3')
    const [maxHints, setMaxHints] = useState('3')
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => { fetchPuzzles() }, [])

    async function fetchPuzzles() {
        const res = await fetch('/api/admin/puzzles')
        const data = await res.json()
        if (data.puzzles) setPuzzles(data.puzzles)
    }

    useEffect(() => {
        if (!masterPassword) { setClues([]); return }
        const newClues: ClueInput[] = masterPassword.split('').map((char, i) => ({
            character_position: i,
            clue_text: clues[i]?.clue_text || '',
            hint_1: clues[i]?.hint_1 || '',
            hint_2: clues[i]?.hint_2 || '',
            hint_3: clues[i]?.hint_3 || '',
            image_url: clues[i]?.image_url || '',
            expected_answer: char.toUpperCase(),
            max_tries: clues[i]?.max_tries || 3,
            lockout_duration_seconds: clues[i]?.lockout_duration_seconds || 30,
        }))
        setClues(newClues)
    }, [masterPassword])

    function updateClue(index: number, field: keyof ClueInput, value: string | number) {
        const updated = [...clues]
        updated[index] = { ...updated[index], [field]: value }
        setClues(updated)
    }

    async function handleSavePuzzle() {
        if (!roundName || !masterPassword || clues.some((c) => !c.clue_text)) {
            setMessage('Fill in all required fields')
            return
        }
        setSaving(true)
        setMessage('')

        try {
            const res = await fetch('/api/admin/puzzles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    round_number: parseInt(roundNumber),
                    round_name: roundName,
                    master_password: masterPassword.toUpperCase(),
                    max_powerups: parseInt(maxPowerups) || 3,
                    max_hints: parseInt(maxHints) || 3,
                    clues: clues.map((c) => ({
                        ...c,
                        expected_answer: c.expected_answer.toUpperCase(),
                    })),
                }),
            })
            if (res.ok) {
                setMessage('✅ Puzzle created!')
                setRoundName('')
                setMasterPassword('')
                setClues([])
                setMaxPowerups('3')
                setMaxHints('3')
                fetchPuzzles()
            } else {
                const data = await res.json()
                setMessage(`❌ ${data.error || 'Failed to create puzzle'}`)
            }
        } catch {
            setMessage('❌ Server error')
        } finally {
            setSaving(false)
        }
    }

    async function handleSetActive(puzzleId: string) {
        await fetch('/api/admin/start-round', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ puzzle_id: puzzleId }),
        })
        fetchPuzzles()
    }

    async function handleDeletePuzzle(puzzleId: string) {
        const res = await fetch('/api/admin/puzzles', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ puzzle_id: puzzleId }),
        })
        if (res.ok) fetchPuzzles()
    }

    return (
        <div>
            <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
                Puzzles
            </h1>

            {/* Puzzle Creator */}
            <div className="card card-glow" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                    Puzzle Creator
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    <div>
                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                            Round #
                        </label>
                        <input type="number" className="input" value={roundNumber} onChange={(e) => setRoundNumber(e.target.value)} min="1" />
                    </div>
                    <div>
                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                            Round Name *
                        </label>
                        <input type="text" className="input" placeholder="e.g. Elimination" value={roundName} onChange={(e) => setRoundName(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                            Master Password *
                        </label>
                        <input type="text" className="input" placeholder="SECRET" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} style={{ textTransform: 'uppercase' }} />
                    </div>
                </div>

                {/* Per-round limits */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    <div>
                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                            ⚡ Max Powerups per Team
                        </label>
                        <input type="number" className="input" value={maxPowerups} onChange={(e) => setMaxPowerups(e.target.value)} min="0" max="10" />
                        <span className="text-mono text-muted" style={{ fontSize: '0.6rem' }}>Set to 0 to disable powerups</span>
                    </div>
                    <div>
                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                            💡 Max Hints per Round
                        </label>
                        <input type="number" className="input" value={maxHints} onChange={(e) => setMaxHints(e.target.value)} min="0" max="20" />
                        <span className="text-mono text-muted" style={{ fontSize: '0.6rem' }}>Set to 0 to disable hints</span>
                    </div>
                </div>

                {/* Clue blocks */}
                {clues.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <h3 className="text-mono text-muted" style={{ fontSize: 'var(--font-sm)', marginBottom: 'var(--space-3)' }}>
                            CLUES ({clues.length} characters)
                        </h3>
                        {clues.map((clue, i) => (
                            <div key={i} className="card" style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-4)' }}>
                                <div className="flex-between" style={{ marginBottom: 'var(--space-3)' }}>
                                    <span className="badge badge-info text-mono">
                                        Letter {i + 1}: &quot;{clue.expected_answer}&quot;
                                    </span>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>Tries:</label>
                                        <input type="number" className="input" value={clue.max_tries} onChange={(e) => updateClue(i, 'max_tries', parseInt(e.target.value) || 3)} min="1" max="10" style={{ width: 60 }} />
                                    </div>
                                </div>

                                {/* Clue Text */}
                                <div style={{ marginBottom: 'var(--space-3)' }}>
                                    <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                                        Clue Text *
                                    </label>
                                    <input type="text" className="input" placeholder="What clue should players see?" value={clue.clue_text} onChange={(e) => updateClue(i, 'clue_text', e.target.value)} style={{ width: '100%' }} />
                                </div>

                                {/* Image URL */}
                                <div style={{ marginBottom: 'var(--space-3)' }}>
                                    <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                                        Image URL (optional)
                                    </label>
                                    <input type="url" className="input" placeholder="https://example.com/image.jpg" value={clue.image_url} onChange={(e) => updateClue(i, 'image_url', e.target.value)} style={{ width: '100%' }} />
                                    {clue.image_url && (
                                        <img src={clue.image_url} alt="Preview" style={{ maxWidth: 200, maxHeight: 120, marginTop: 'var(--space-2)', borderRadius: 4, border: '1px solid var(--border-dim)' }} />
                                    )}
                                </div>

                                {/* 3 Hints */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
                                    <div>
                                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                                            💡 Hint 1 (Vague)
                                        </label>
                                        <input type="text" className="input" placeholder="Easy hint" value={clue.hint_1} onChange={(e) => updateClue(i, 'hint_1', e.target.value)} style={{ width: '100%' }} />
                                    </div>
                                    <div>
                                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                                            💡 Hint 2 (Medium)
                                        </label>
                                        <input type="text" className="input" placeholder="Stronger hint" value={clue.hint_2} onChange={(e) => updateClue(i, 'hint_2', e.target.value)} style={{ width: '100%' }} />
                                    </div>
                                    <div>
                                        <label className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-1)' }}>
                                            💡 Hint 3 (Strong)
                                        </label>
                                        <input type="text" className="input" placeholder="Nearly gives it away" value={clue.hint_3} onChange={(e) => updateClue(i, 'hint_3', e.target.value)} style={{ width: '100%' }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {message && (
                    <p className="text-mono" style={{ fontSize: 'var(--font-sm)', marginBottom: 'var(--space-3)', color: message.startsWith('✅') ? 'var(--neon-success)' : 'var(--neon-danger)' }}>
                        {message}
                    </p>
                )}

                <button
                    className="btn btn-primary"
                    onClick={handleSavePuzzle}
                    disabled={saving || !masterPassword || !roundName}
                    style={{ width: '100%' }}
                >
                    {saving ? 'SAVING...' : 'CREATE PUZZLE'}
                </button>
            </div>

            {/* Existing Rounds */}
            <h2 className="text-mono" style={{ fontSize: 'var(--font-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                Existing Rounds ({puzzles.length})
            </h2>

            {puzzles.map((puzzle) => (
                <div key={puzzle.id} className="card" style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                            <span style={{ fontWeight: 600 }}>{puzzle.round_name}</span>
                            {puzzle.is_active && <span className="badge badge-success" style={{ fontSize: 'var(--font-xs)' }}>ACTIVE</span>}
                            {puzzle.is_live && <span className="badge badge-warning" style={{ fontSize: 'var(--font-xs)' }}>LIVE</span>}
                        </div>
                        <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                            Round #{puzzle.round_number} • {puzzle.master_password.length} letters • {puzzle.clues?.length || 0} clues • ⚡{puzzle.max_powerups ?? 3} / 💡{puzzle.max_hints ?? 3}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {!puzzle.is_active && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleSetActive(puzzle.id)}>
                                SET ACTIVE
                            </button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeletePuzzle(puzzle.id)}>
                            DELETE
                        </button>
                    </div>
                </div>
            ))}

            {puzzles.length === 0 && (
                <p className="text-muted text-mono" style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
                    No puzzles created yet.
                </p>
            )}
        </div>
    )
}
