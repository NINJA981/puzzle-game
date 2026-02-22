'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ClueData {
    clue_text: string
    character_position: number
    max_tries: number
}

interface GameState {
    puzzleId: string
    roundName: string
    totalChars: number
    currentIndex: number
    hintTokens: number
    clue: ClueData | null
    triesRemaining: number
    lockedUntil: string | null
    hintText: string | null
    completedRound: boolean
    loading: boolean
}

export default function PlayPage() {
    const router = useRouter()
    const supabase = createClient()

    const [teamId, setTeamId] = useState<string | null>(null)
    const [guess, setGuess] = useState('')
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'lockout'; message: string } | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [shakeInput, setShakeInput] = useState(false)
    const [lockoutSeconds, setLockoutSeconds] = useState(0)

    const [state, setState] = useState<GameState>({
        puzzleId: '',
        roundName: '',
        totalChars: 0,
        currentIndex: 0,
        hintTokens: 3,
        clue: null,
        triesRemaining: 0,
        lockedUntil: null,
        hintText: null,
        completedRound: false,
        loading: true,
    })

    const fetchGameState = useCallback(async (tid: string) => {
        try {
            // Get team
            const { data: team } = await supabase
                .from('teams')
                .select('*')
                .eq('id', tid)
                .single()

            if (!team) return

            // Get active puzzle
            const { data: puzzle } = await supabase
                .from('puzzles')
                .select('*')
                .eq('is_active', true)
                .single()

            if (!puzzle) return

            // Check if completed
            if (team.completed_at) {
                setState((prev) => ({ ...prev, completedRound: true, loading: false }))
                return
            }

            // Get current clue (only safe fields)
            const { data: clue } = await supabase
                .from('clues')
                .select('clue_text, character_position, max_tries')
                .eq('puzzle_id', puzzle.id)
                .eq('character_position', team.current_character_index)
                .single()

            // Get progress for this clue
            let triesRemaining = clue?.max_tries || 3
            let lockedUntil = null

            if (clue) {
                const { data: allClues } = await supabase
                    .from('clues')
                    .select('id')
                    .eq('puzzle_id', puzzle.id)
                    .eq('character_position', team.current_character_index)
                    .single()

                if (allClues) {
                    const { data: progress } = await supabase
                        .from('team_progress')
                        .select('tries_used, locked_until')
                        .eq('team_id', tid)
                        .eq('clue_id', allClues.id)
                        .single()

                    if (progress) {
                        triesRemaining = clue.max_tries - progress.tries_used
                        if (progress.locked_until) {
                            const lockEnd = new Date(progress.locked_until)
                            if (lockEnd > new Date()) {
                                lockedUntil = progress.locked_until
                            } else {
                                triesRemaining = clue.max_tries
                            }
                        }
                    }
                }
            }

            setState({
                puzzleId: puzzle.id,
                roundName: puzzle.round_name,
                totalChars: puzzle.master_password.length,
                currentIndex: team.current_character_index,
                hintTokens: team.hint_tokens,
                clue: clue || null,
                triesRemaining,
                lockedUntil,
                hintText: null,
                completedRound: team.current_character_index >= puzzle.master_password.length,
                loading: false,
            })
        } catch (err) {
            console.error('Failed to fetch game state:', err)
        }
    }, [supabase])

    useEffect(() => {
        const id = localStorage.getItem('team_id')
        if (!id) {
            router.push('/')
            return
        }
        setTeamId(id)
        fetchGameState(id)
    }, [router, fetchGameState])

    // Lockout countdown timer
    useEffect(() => {
        if (!state.lockedUntil) {
            setLockoutSeconds(0)
            return
        }

        const updateTimer = () => {
            const remaining = Math.max(0, Math.ceil((new Date(state.lockedUntil!).getTime() - Date.now()) / 1000))
            setLockoutSeconds(remaining)
            if (remaining <= 0 && teamId) {
                setState((prev) => ({ ...prev, lockedUntil: null }))
                fetchGameState(teamId)
            }
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)
        return () => clearInterval(interval)
    }, [state.lockedUntil, teamId, fetchGameState])

    async function handleSubmitGuess() {
        if (!guess.trim() || submitting || lockoutSeconds > 0) return

        setSubmitting(true)
        setFeedback(null)

        try {
            const res = await fetch('/api/verify-guess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_id: teamId, guess: guess.trim() }),
            })

            const data = await res.json()

            if (data.success) {
                setFeedback({ type: 'success', message: 'CORRECT!' })
                setGuess('')

                if (data.completed_round) {
                    setState((prev) => ({ ...prev, completedRound: true }))
                } else {
                    setTimeout(() => {
                        setFeedback(null)
                        if (teamId) fetchGameState(teamId)
                    }, 1200)
                }
            } else if (data.locked_until) {
                setState((prev) => ({
                    ...prev,
                    lockedUntil: data.locked_until,
                    triesRemaining: 0,
                }))
                setFeedback({ type: 'lockout', message: 'LOCKED OUT — Too many wrong answers' })
                setShakeInput(true)
                setTimeout(() => setShakeInput(false), 500)
            } else {
                setState((prev) => ({ ...prev, triesRemaining: data.tries_remaining }))
                setFeedback({ type: 'error', message: `WRONG — ${data.tries_remaining} tries left` })
                setShakeInput(true)
                setGuess('')
                setTimeout(() => setShakeInput(false), 500)
            }
        } catch {
            setFeedback({ type: 'error', message: 'Connection error' })
        } finally {
            setSubmitting(false)
        }
    }

    async function handleUseHint() {
        if (state.hintTokens <= 0) return

        try {
            const res = await fetch('/api/use-hint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_id: teamId }),
            })

            const data = await res.json()

            if (data.success) {
                setState((prev) => ({
                    ...prev,
                    hintText: data.hint_text,
                    hintTokens: data.tokens_remaining,
                }))
            }
        } catch {
            // Silently fail
        }
    }

    if (state.loading) {
        return (
            <main className="page-container flex-center">
                <div className="text-center">
                    <div className="animate-pulse text-neon glow-text" style={{ fontSize: 'var(--font-2xl)' }}>
                        LOADING...
                    </div>
                </div>
            </main>
        )
    }

    if (state.completedRound) {
        return (
            <main className="page-container flex-center">
                <div className="text-center animate-fade-in-up">
                    <div
                        className="glow-text"
                        style={{ fontSize: 'var(--font-4xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}
                    >
                        🎉
                    </div>
                    <h1
                        className="text-neon glow-text"
                        style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginBottom: 'var(--space-3)' }}
                    >
                        ROUND COMPLETE!
                    </h1>
                    <p className="text-secondary mb-6">
                        You decoded the password. Great work!
                    </p>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => router.push('/leaderboard')}
                    >
                        VIEW LEADERBOARD
                    </button>
                </div>
            </main>
        )
    }

    const progressPercent = state.totalChars > 0 ? (state.currentIndex / state.totalChars) * 100 : 0
    const isLockedOut = lockoutSeconds > 0

    return (
        <main className="page-container" style={{ justifyContent: 'space-between' }}>
            {/* Header */}
            <header style={{ marginBottom: 'var(--space-5)' }}>
                <div className="flex-between mb-3">
                    <span className="badge badge-info">{state.roundName}</span>
                    <span className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                        LETTER {state.currentIndex + 1} / {state.totalChars}
                    </span>
                </div>

                {/* Progress bar */}
                <div
                    style={{
                        width: '100%',
                        height: 4,
                        background: 'var(--bg-elevated)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: 'var(--neon-primary)',
                            boxShadow: 'var(--glow-sm)',
                            transition: 'width 0.5s ease',
                        }}
                    />
                </div>
            </header>

            {/* Password visualization */}
            <div className="flex-center mb-5" style={{ gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {Array.from({ length: state.totalChars }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            width: 36,
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'var(--font-lg)',
                            fontWeight: 600,
                            border: `1px solid ${i === state.currentIndex ? 'var(--neon-primary)' : i < state.currentIndex ? 'var(--neon-primary-dim)' : 'var(--border-dim)'}`,
                            color: i < state.currentIndex ? 'var(--neon-primary)' : i === state.currentIndex ? 'var(--neon-secondary)' : 'var(--text-muted)',
                            background: i === state.currentIndex ? 'rgba(0, 255, 170, 0.05)' : 'transparent',
                            boxShadow: i === state.currentIndex ? 'var(--glow-sm)' : 'none',
                            transition: 'all var(--transition-base)',
                        }}
                    >
                        {i < state.currentIndex ? '✓' : i === state.currentIndex ? '?' : '·'}
                    </div>
                ))}
            </div>

            {/* Clue Card */}
            <div className="card card-glow mb-5 animate-fade-in-up" style={{ textAlign: 'center' }}>
                <p
                    className="text-mono text-muted mb-2"
                    style={{ fontSize: 'var(--font-xs)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                    CLUE
                </p>
                <p style={{ fontSize: 'var(--font-lg)', lineHeight: 1.5 }}>
                    {state.clue?.clue_text || 'No clue available'}
                </p>

                {state.hintText && (
                    <div
                        style={{
                            marginTop: 'var(--space-4)',
                            padding: 'var(--space-3)',
                            background: 'rgba(0, 229, 255, 0.08)',
                            border: '1px solid var(--neon-secondary)',
                        }}
                    >
                        <p className="text-mono" style={{ fontSize: 'var(--font-xs)', color: 'var(--neon-secondary)', marginBottom: 'var(--space-1)' }}>
                            💡 HINT
                        </p>
                        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--neon-secondary)' }}>
                            {state.hintText}
                        </p>
                    </div>
                )}
            </div>

            {/* Lockout Overlay */}
            {isLockedOut && (
                <div className="card mb-5 text-center" style={{ border: '1px solid var(--neon-danger)', background: 'rgba(255, 51, 102, 0.05)' }}>
                    <p className="text-mono text-danger mb-2" style={{ fontSize: 'var(--font-xs)', textTransform: 'uppercase' }}>
                        ⏳ LOCKED OUT
                    </p>
                    <p
                        className="text-danger glow-text"
                        style={{
                            fontSize: 'var(--font-3xl)',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            textShadow: '0 0 10px rgba(255, 51, 102, 0.5)',
                        }}
                    >
                        {Math.floor(lockoutSeconds / 60)}:{(lockoutSeconds % 60).toString().padStart(2, '0')}
                    </p>
                </div>
            )}

            {/* Guess Input */}
            <div className="mb-4">
                <div className={shakeInput ? 'animate-shake' : ''}>
                    <input
                        type="text"
                        className={`input input-lg ${feedback?.type === 'error' || feedback?.type === 'lockout' ? 'input-error' : ''}`}
                        value={guess}
                        onChange={(e) => setGuess(e.target.value.toUpperCase())}
                        placeholder={isLockedOut ? 'LOCKED' : 'YOUR ANSWER'}
                        disabled={isLockedOut || submitting}
                        maxLength={20}
                        autoComplete="off"
                        spellCheck={false}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSubmitGuess()
                        }}
                        style={{ letterSpacing: '0.15em' }}
                    />
                </div>
            </div>

            {/* Feedback */}
            {feedback && (
                <div
                    className="mb-4 text-center text-mono animate-fade-in-up"
                    style={{
                        fontSize: 'var(--font-sm)',
                        color: feedback.type === 'success' ? 'var(--neon-success)' : 'var(--neon-danger)',
                        textShadow: feedback.type === 'success'
                            ? '0 0 8px rgba(0, 255, 136, 0.5)'
                            : '0 0 8px rgba(255, 51, 102, 0.3)',
                    }}
                >
                    {feedback.message}
                </div>
            )}

            {/* Tries indicators */}
            {!isLockedOut && state.clue && (
                <div className="flex-center gap-2 mb-5">
                    {Array.from({ length: state.clue.max_tries }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: i < state.triesRemaining ? 'var(--neon-primary)' : 'var(--bg-elevated)',
                                border: '1px solid var(--border-dim)',
                                boxShadow: i < state.triesRemaining ? '0 0 4px var(--neon-primary)' : 'none',
                                transition: 'all var(--transition-fast)',
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleUseHint}
                    disabled={state.hintTokens <= 0 || !!state.hintText}
                    style={{ flex: 1 }}
                >
                    💡 HINT ({state.hintTokens})
                </button>
                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleSubmitGuess}
                    disabled={!guess.trim() || isLockedOut || submitting}
                    style={{ flex: 2 }}
                >
                    {submitting ? 'CHECKING...' : 'SUBMIT →'}
                </button>
            </div>
        </main>
    )
}
