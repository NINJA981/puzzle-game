'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Clue, GameBroadcast } from '@/lib/types'

interface TeamPowerupUI {
    id: string
    powerup_id: string
    is_used: boolean
    name: string
    icon: string
    description: string
    slug: string
}

interface CharProgress {
    position: number
    letter: string
    clue: Clue
    triesUsed: number
    triesMax: number
    completed: boolean
    guessedAnswer: string | null
    revealedHints: number[]
}

export default function PlayPage() {
    const [teamId, setTeamId] = useState<string | null>(null)
    const [teamName, setTeamName] = useState('')
    const [hintTokens, setHintTokens] = useState(3)
    const [characters, setCharacters] = useState<CharProgress[]>([])
    const [activeCharIndex, setActiveCharIndex] = useState(0)
    const [guess, setGuess] = useState('')
    const [feedback, setFeedback] = useState('')
    const [feedbackType, setFeedbackType] = useState<'success' | 'error' | 'warning' | ''>('')
    const [submitting, setSubmitting] = useState(false)
    const [loading, setLoading] = useState(true)
    const [roundName, setRoundName] = useState('')
    const [isEliminated, setIsEliminated] = useState(false)
    const [gameEnded, setGameEnded] = useState(false)
    const [imageUrl, setImageUrl] = useState('')
    const [hintsUsedTotal, setHintsUsedTotal] = useState(0)
    const [maxHints, setMaxHints] = useState(3)
    const [powerups, setPowerups] = useState<TeamPowerupUI[]>([])
    const [powerupFeedback, setPowerupFeedback] = useState('')
    const [powerupsEnabled, setPowerupsEnabled] = useState(true)
    const supabaseRef = useRef(createClient())
    const router = useRouter()

    const loadGameState = useCallback(async () => {
        const supabase = supabaseRef.current
        const id = localStorage.getItem('team_id')
        if (!id) { router.push('/'); return }
        setTeamId(id)

        // Get team
        const { data: team } = await supabase
            .from('teams')
            .select('*')
            .eq('id', id)
            .single()

        if (!team) { router.push('/'); return }
        setTeamName(team.team_name || '')
        setHintTokens(team.hint_tokens)
        setIsEliminated(team.is_eliminated)
        setHintsUsedTotal(team.hints_used_total || 0)

        if (team.is_eliminated) {
            setLoading(false)
            return
        }

        // Get active puzzle
        const { data: puzzle } = await supabase
            .from('puzzles')
            .select('*')
            .eq('is_active', true)
            .single()

        if (!puzzle) { setLoading(false); return }
        setRoundName(puzzle.round_name)
        setMaxHints(puzzle.max_hints ?? 3)
        setPowerupsEnabled((puzzle.max_powerups ?? 3) > 0)

        // Get all clues for this puzzle
        const { data: clues } = await supabase
            .from('clues')
            .select('*')
            .eq('puzzle_id', puzzle.id)
            .order('character_position', { ascending: true })

        if (!clues || clues.length === 0) { setLoading(false); return }

        // Get team progress for all characters
        const { data: progress } = await supabase
            .from('team_progress')
            .select('*')
            .eq('team_id', id)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const progressMap = new Map<string, any>(progress?.map((p: any) => [p.clue_id, p]) || [])
        const password = puzzle.master_password

        const chars: CharProgress[] = clues.map((clue: Clue, i: number) => {
            const prog = progressMap.get(clue.id)
            return {
                position: i,
                letter: password[i] || '?',
                clue,
                triesUsed: prog?.tries_used ?? 0,
                triesMax: clue.max_tries || 3,
                completed: !!prog?.completed,
                guessedAnswer: prog?.completed ? password[i] : null,
                revealedHints: [],
            }
        })
        setCharacters(chars)

        // Set active to first incomplete character
        const firstIncomplete = chars.findIndex((c) => !c.completed)
        if (firstIncomplete >= 0) setActiveCharIndex(firstIncomplete)

        const currentIdx = firstIncomplete >= 0 ? firstIncomplete : 0
        if (clues[currentIdx]?.image_url) {
            setImageUrl(clues[currentIdx].image_url)
        }

        // Load team powerups for this puzzle
        const { data: teamPowerups } = await supabase
            .from('team_powerups')
            .select('*, powerup:powerups(*)')
            .eq('team_id', id)
            .eq('puzzle_id', puzzle.id)

        if (teamPowerups) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped = teamPowerups.map((tp: any) => ({
                id: tp.id,
                powerup_id: tp.powerup_id,
                is_used: tp.is_used,
                name: tp.powerup?.name || 'Unknown',
                icon: tp.powerup?.icon || '⚡',
                description: tp.powerup?.description || '',
                slug: tp.powerup?.slug || '',
            }))
            setPowerups(mapped)
        }

        setLoading(false)
    }, [router])

    useEffect(() => {
        loadGameState()
    }, [loadGameState])

    useEffect(() => {
        const supabase = supabaseRef.current
        const channel = supabase
            .channel('game_play')
            .on('broadcast', { event: 'game_event' }, ({ payload }: { payload: GameBroadcast }) => {
                if (payload.type === 'GAME_END') {
                    setGameEnded(true)
                    router.push('/leaderboard')
                }
                if (payload.type === 'EXTRA_LIFE') {
                    setIsEliminated(false)
                    loadGameState()
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [router, loadGameState])

    async function handleSubmitGuess() {
        if (!teamId || !guess.trim() || submitting) return
        setSubmitting(true)
        setFeedback('')
        setFeedbackType('')

        try {
            const res = await fetch('/api/verify-guess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_id: teamId,
                    guess: guess.trim(),
                    character_position: activeCharIndex,
                }),
            })
            const data = await res.json()

            if (data.is_eliminated) {
                setIsEliminated(true)
                setFeedback('ELIMINATED — All tries exhausted!')
                setFeedbackType('error')
                return
            }

            if (data.anti_eliminate_used) {
                setFeedback('🛡️ Anti-Eliminate shield saved you! Locked out temporarily.')
                setFeedbackType('warning')
                // Refresh powerups to show it as used
                loadGameState()
                setGuess('')
                return
            }

            if (data.success) {
                if (data.already_completed) {
                    setFeedback('Already solved!')
                    setFeedbackType('warning')
                } else {
                    setFeedback('CORRECT! ✓')
                    setFeedbackType('success')
                    const updated = [...characters]
                    updated[activeCharIndex] = {
                        ...updated[activeCharIndex],
                        completed: true,
                        guessedAnswer: characters[activeCharIndex].letter,
                    }
                    setCharacters(updated)

                    if (data.completed_round) {
                        setFeedback('🎉 ALL CHARACTERS SOLVED!')
                        setFeedbackType('success')
                    } else {
                        // Auto-advance to next incomplete
                        const nextIncomplete = updated.findIndex((c, i) => i !== activeCharIndex && !c.completed)
                        if (nextIncomplete >= 0) {
                            setTimeout(() => setActiveCharIndex(nextIncomplete), 1000)
                        }
                    }
                }
            } else {
                setFeedback(`WRONG — ${data.tries_remaining} tries left`)
                setFeedbackType('error')
                const updated = [...characters]
                updated[activeCharIndex] = {
                    ...updated[activeCharIndex],
                    triesUsed: updated[activeCharIndex].triesMax - (data.tries_remaining || 0),
                }
                setCharacters(updated)
            }
            setGuess('')
        } catch {
            setFeedback('Connection error')
            setFeedbackType('error')
        } finally {
            setSubmitting(false)
        }
    }

    async function handleUseHint(level: number) {
        if (!teamId || hintTokens <= 0) return

        // Client-side check for per-round limit
        if (hintsUsedTotal >= maxHints) {
            setFeedback(`Hint limit reached for this round (${maxHints} max)`)
            setFeedbackType('error')
            return
        }

        try {
            const res = await fetch('/api/use-hint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    team_id: teamId,
                    character_position: activeCharIndex,
                    hint_level: level,
                }),
            })
            const data = await res.json()

            if (data.success) {
                const updated = [...characters]
                updated[activeCharIndex] = {
                    ...updated[activeCharIndex],
                    revealedHints: [...updated[activeCharIndex].revealedHints, level],
                }
                setCharacters(updated)
                setHintTokens(data.tokens_remaining)
                setHintsUsedTotal(data.hints_used_this_round ?? (hintsUsedTotal + 1))
                setFeedback(`💡 Hint ${level}: ${data.hint_text}`)
                setFeedbackType('warning')
            } else {
                setFeedback(data.error || 'No hints available')
                setFeedbackType('error')
            }
        } catch {
            setFeedback('Connection error')
            setFeedbackType('error')
        }
    }

    async function handleUsePowerup(p: TeamPowerupUI) {
        if (p.is_used || !teamId) return
        try {
            const res = await fetch('/api/powerups/use', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_id: teamId, powerup_id: p.powerup_id }),
            })
            const data = await res.json()
            if (res.ok) {
                setPowerups((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, is_used: true } : pp))
                setPowerupFeedback(`${p.icon} ${data.message || p.name + ' activated!'}`)
                setTimeout(() => setPowerupFeedback(''), 3000)
                loadGameState()
            } else {
                setPowerupFeedback(data.error || 'Failed')
                setTimeout(() => setPowerupFeedback(''), 3000)
            }
        } catch {
            setPowerupFeedback('Connection error')
            setTimeout(() => setPowerupFeedback(''), 3000)
        }
    }

    // ELIMINATED SCREEN
    if (isEliminated) {
        return (
            <main className="page-container flex-center" style={{ textAlign: 'center' }}>
                <div className="animate-fade-in-up">
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>💀</div>
                    <h1 className="glow-text" style={{ fontSize: 'var(--font-3xl)', color: '#ff4444', marginBottom: 'var(--space-3)' }}>
                        ELIMINATED
                    </h1>
                    <p className="text-mono text-muted" style={{ fontSize: 'var(--font-base)', marginBottom: 'var(--space-4)' }}>
                        All tries exhausted on a character.
                    </p>
                    <div className="card" style={{ maxWidth: 400, margin: '0 auto', padding: 'var(--space-5)' }}>
                        <p className="text-mono" style={{ fontSize: 'var(--font-sm)', color: 'var(--neon-warning)' }}>
                            ⏳ Waiting for admin to grant extra life...
                        </p>
                    </div>
                    <p className="text-muted" style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-xs)' }}>
                        {teamName}
                    </p>
                </div>
            </main>
        )
    }

    if (loading) {
        return (
            <main className="page-container flex-center">
                <div className="animate-pulse text-neon glow-text" style={{ fontSize: 'var(--font-xl)' }}>
                    LOADING...
                </div>
            </main>
        )
    }

    if (gameEnded) {
        return (
            <main className="page-container flex-center" style={{ textAlign: 'center' }}>
                <div className="animate-fade-in-up">
                    <h1 className="glow-text" style={{ fontSize: 'var(--font-3xl)' }}>GAME OVER</h1>
                    <p className="text-mono text-muted">Redirecting to leaderboard...</p>
                </div>
            </main>
        )
    }

    if (characters.length === 0) {
        return (
            <main className="page-container flex-center">
                <p className="text-muted text-mono">Waiting for puzzle...</p>
            </main>
        )
    }

    const currentChar = characters[activeCharIndex]
    const completedCount = characters.filter((c) => c.completed).length
    const allCompleted = completedCount === characters.length
    const triesRemaining = currentChar ? currentChar.triesMax - currentChar.triesUsed : 0
    const hintsRemaining = maxHints - hintsUsedTotal
    const hintsDisabled = hintsRemaining <= 0

    return (
        <main className="page-container" style={{ maxWidth: 700, margin: '0 auto' }}>
            {/* Header */}
            <div className="flex-between animate-fade-in-up" style={{ marginBottom: 'var(--space-4)' }}>
                <span className="badge badge-info text-mono" style={{ fontSize: 'var(--font-xs)' }}>
                    {roundName}
                </span>
                <span className="text-mono text-muted" style={{ fontSize: 'var(--font-sm)' }}>
                    {completedCount} / {characters.length} SOLVED
                </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: 'var(--bg-elevated)', marginBottom: 'var(--space-5)', overflow: 'hidden' }}>
                <div style={{ width: `${(completedCount / characters.length) * 100}%`, height: '100%', background: 'var(--neon-primary)', transition: 'width 0.5s ease' }} />
            </div>

            {/* Character Navigation Slots */}
            <div className="animate-fade-in-up" style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
                {characters.map((char, i) => (
                    <button
                        key={i}
                        onClick={() => { setActiveCharIndex(i); setGuess(''); setFeedback(''); setFeedbackType(''); setImageUrl(char.clue.image_url || '') }}
                        style={{
                            width: 48,
                            height: 48,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 'var(--font-lg)',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            background: char.completed
                                ? 'rgba(0, 255, 170, 0.15)'
                                : i === activeCharIndex
                                    ? 'rgba(0, 255, 170, 0.05)'
                                    : 'var(--bg-elevated)',
                            border: i === activeCharIndex
                                ? '2px solid var(--neon-primary)'
                                : char.completed
                                    ? '2px solid var(--neon-success)'
                                    : char.triesUsed > 0
                                        ? '2px solid var(--neon-warning)'
                                        : '1px solid var(--border-dim)',
                            color: char.completed
                                ? 'var(--neon-success)'
                                : i === activeCharIndex
                                    ? 'var(--neon-primary)'
                                    : 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {char.completed ? char.letter : i === activeCharIndex ? '?' : '·'}
                    </button>
                ))}
            </div>

            {/* All completed - celebration */}
            {allCompleted && (
                <div className="card card-glow animate-fade-in-up" style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>🎉</div>
                    <h2 className="glow-text" style={{ fontSize: 'var(--font-xl)', marginBottom: 'var(--space-2)' }}>
                        ALL CHARACTERS SOLVED!
                    </h2>
                    <p className="text-mono" style={{ fontSize: 'var(--font-lg)', letterSpacing: 4, color: 'var(--neon-success)' }}>
                        {characters.map((c) => c.letter).join('')}
                    </p>
                    <p className="text-muted text-mono" style={{ fontSize: 'var(--font-xs)', marginTop: 'var(--space-2)' }}>
                        Hints used: {hintsUsedTotal} • Waiting for results...
                    </p>
                    <button
                        className="btn btn-secondary"
                        onClick={() => router.push('/leaderboard')}
                        style={{ marginTop: 'var(--space-4)' }}
                    >
                        📊 VIEW LEADERBOARD
                    </button>
                </div>
            )}

            {/* Active Clue Card */}
            {!allCompleted && currentChar && (
                <div className="animate-fade-in-up">
                    {/* Image */}
                    {imageUrl && (
                        <div style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                            <img
                                src={imageUrl}
                                alt="Clue image"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: 300,
                                    borderRadius: 8,
                                    border: '1px solid var(--border-dim)',
                                }}
                            />
                        </div>
                    )}

                    {/* Clue */}
                    <div className="card card-glow" style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                        <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', marginBottom: 'var(--space-2)' }}>CLUE</p>
                        <p style={{ fontSize: 'var(--font-lg)', fontWeight: 500 }}>
                            {currentChar.clue.clue_text}
                        </p>
                    </div>

                    {/* Guess input */}
                    {!currentChar.completed && (
                        <>
                            <input
                                type="text"
                                className="input text-center text-mono"
                                placeholder="YOUR ANSWER"
                                value={guess}
                                onChange={(e) => setGuess(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmitGuess()}
                                style={{ width: '100%', marginBottom: 'var(--space-3)', fontSize: 'var(--font-lg)', letterSpacing: 2 }}
                                disabled={submitting}
                            />

                            {/* Tries indicator */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 'var(--space-3)' }}>
                                {Array.from({ length: currentChar.triesMax }).map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            background: i < triesRemaining ? 'var(--neon-primary)' : 'var(--neon-danger)',
                                            transition: 'background 0.3s ease',
                                        }}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Feedback */}
                    {feedback && (
                        <div
                            className="animate-fade-in-up"
                            style={{
                                textAlign: 'center',
                                padding: 'var(--space-3)',
                                marginBottom: 'var(--space-3)',
                                fontSize: 'var(--font-sm)',
                                fontFamily: 'var(--font-mono)',
                                color: feedbackType === 'success' ? 'var(--neon-success)' : feedbackType === 'error' ? 'var(--neon-danger)' : 'var(--neon-warning)',
                                background: 'var(--bg-elevated)',
                                borderRadius: 6,
                            }}
                        >
                            {feedback}
                        </div>
                    )}

                    {/* Revealed hints */}
                    {currentChar.revealedHints.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-3)' }}>
                            {currentChar.revealedHints.map((level) => (
                                <div key={level} className="card" style={{ padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-1)', fontSize: 'var(--font-xs)', color: 'var(--neon-warning)' }}>
                                    💡 Hint {level} revealed
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action buttons */}
                    {!currentChar.completed && (
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', alignItems: 'center' }}>
                            {/* Hint buttons */}
                            <div style={{ display: 'flex', gap: 'var(--space-1)', flex: 1, alignItems: 'center' }}>
                                {[1, 2, 3].map((level) => (
                                    <button
                                        key={level}
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => handleUseHint(level)}
                                        disabled={hintTokens <= 0 || hintsDisabled || currentChar.revealedHints.includes(level)}
                                        style={{
                                            flex: 1,
                                            fontSize: 'var(--font-xs)',
                                            opacity: (hintsDisabled || currentChar.revealedHints.includes(level)) ? 0.4 : 1,
                                        }}
                                    >
                                        💡 {level}
                                    </button>
                                ))}
                                <span
                                    className="text-mono"
                                    style={{
                                        fontSize: 'var(--font-xs)',
                                        marginLeft: 4,
                                        color: hintsDisabled ? 'var(--neon-danger)' : 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {hintsUsedTotal}/{maxHints}
                                </span>
                            </div>

                            {/* Submit */}
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmitGuess}
                                disabled={!guess.trim() || submitting}
                                style={{ minWidth: 120 }}
                            >
                                {submitting ? '...' : 'SUBMIT →'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Powerup Toolbar */}
            {powerupsEnabled && powerups.length > 0 && !allCompleted && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                    <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', marginBottom: 'var(--space-2)' }}>POWERUPS</p>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {powerups.map((p) => (
                            <button
                                key={p.id}
                                className="card"
                                disabled={p.is_used}
                                onClick={() => handleUsePowerup(p)}
                                style={{
                                    padding: 'var(--space-2) var(--space-3)',
                                    cursor: p.is_used ? 'not-allowed' : 'pointer',
                                    opacity: p.is_used ? 0.35 : 1,
                                    border: p.is_used ? '1px solid var(--border-dim)' : '1px solid var(--neon-warning)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    fontSize: 'var(--font-sm)',
                                    textDecoration: p.is_used ? 'line-through' : 'none',
                                    transition: 'all 0.2s ease',
                                }}
                                title={p.description}
                            >
                                <span style={{ fontSize: '1.2rem' }}>{p.icon}</span>
                                <span className="text-mono">{p.name}</span>
                                {p.is_used && <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>USED</span>}
                            </button>
                        ))}
                    </div>
                    {powerupFeedback && (
                        <p className="text-mono animate-fade-in-up" style={{ fontSize: 'var(--font-xs)', color: 'var(--neon-warning)', marginTop: 'var(--space-2)' }}>
                            {powerupFeedback}
                        </p>
                    )}
                </div>
            )}

            {/* Stats footer */}
            <div className="text-center text-muted text-mono" style={{ fontSize: 'var(--font-xs)', marginTop: 'var(--space-4)' }}>
                {teamName} • Hints: {hintsUsedTotal}/{maxHints} used
            </div>
        </main>
    )
}
