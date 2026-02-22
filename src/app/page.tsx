'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [step, setStep] = useState<'code' | 'name'>('code')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    inputRef.current?.focus()
  }, [step])

  async function handleJoin() {
    if (code.length !== 6) {
      setError('Code must be 6 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase(), team_name: teamName || `Team ${code}` }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to join')
        setLoading(false)
        return
      }

      localStorage.setItem('team_id', data.team_id)
      localStorage.setItem('join_code', code.toUpperCase())
      router.push('/lobby')
    } catch {
      setError('Connection failed. Try again.')
      setLoading(false)
    }
  }

  return (
    <main className="page-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 400 }}>
        {/* Title */}
        <div className="text-center mb-7">
          <h1
            className="glow-text"
            style={{
              fontSize: 'var(--font-4xl)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: 'var(--space-3)',
            }}
          >
            DECODE
          </h1>
          <p className="text-mono text-muted" style={{ fontSize: 'var(--font-sm)' }}>
            ENTER YOUR TEAM ACCESS CODE
          </p>
        </div>

        {step === 'code' ? (
          <>
            {/* Code Input */}
            <div className="mb-5">
              <input
                ref={inputRef}
                type="text"
                className={`input input-lg ${error ? 'input-error animate-shake' : ''}`}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
                  if (val.length <= 6) {
                    setCode(val)
                    setError('')
                  }
                }}
                placeholder="_ _ _ _ _ _"
                maxLength={6}
                autoComplete="off"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && code.length === 6) setStep('name')
                }}
              />
            </div>

            {/* Code characters display */}
            <div
              className="flex-center mb-6"
              style={{ gap: 'var(--space-2)' }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 40,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--font-xl)',
                    fontWeight: 600,
                    color: code[i] ? 'var(--neon-primary)' : 'var(--text-muted)',
                    borderBottom: `2px solid ${code[i] ? 'var(--neon-primary)' : 'var(--border-dim)'}`,
                    transition: 'all var(--transition-fast)',
                    textShadow: code[i] ? '0 0 8px rgba(0, 255, 170, 0.5)' : 'none',
                  }}
                >
                  {code[i] || '·'}
                </div>
              ))}
            </div>

            {error && (
              <p className="text-danger text-mono text-center mb-4" style={{ fontSize: 'var(--font-sm)' }}>
                ⚠ {error}
              </p>
            )}

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              onClick={() => setStep('name')}
              disabled={code.length !== 6}
            >
              CONTINUE →
            </button>
          </>
        ) : (
          <>
            {/* Team Name Input */}
            <div className="mb-3">
              <label
                className="text-mono text-muted"
                style={{
                  fontSize: 'var(--font-xs)',
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Team Name (optional)
              </label>
              <input
                ref={inputRef}
                type="text"
                className="input"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter your team name..."
                maxLength={30}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoin()
                }}
              />
            </div>

            <p className="text-muted mb-5" style={{ fontSize: 'var(--font-xs)' }}>
              Code: <span className="text-neon text-mono">{code}</span>
            </p>

            {error && (
              <p className="text-danger text-mono text-center mb-4" style={{ fontSize: 'var(--font-sm)' }}>
                ⚠ {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setStep('code')}
                disabled={loading}
              >
                ← BACK
              </button>
              <button
                className="btn btn-primary btn-lg"
                style={{ flex: 2 }}
                onClick={handleJoin}
                disabled={loading}
              >
                {loading ? 'CONNECTING...' : 'JOIN GAME →'}
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-auto" style={{ marginTop: 'var(--space-7)' }}>
          <p className="text-muted" style={{ fontSize: 'var(--font-xs)' }}>
            Ask your organizer for an access code
          </p>
        </div>
      </div>
    </main>
  )
}
