'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        router.push('/admin')
        router.refresh()
    }

    return (
        <main className="page-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div className="animate-fade-in-up" style={{ width: '100%', maxWidth: 380 }}>
                <div className="text-center mb-6">
                    <h1
                        className="text-neon glow-text"
                        style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}
                    >
                        MISSION CONTROL
                    </h1>
                    <p className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)', textTransform: 'uppercase' }}>
                        Admin Access Required
                    </p>
                </div>

                <form onSubmit={handleLogin} className="card card-glow">
                    <div className="mb-4">
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
                            Email
                        </label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="mb-5">
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
                            Password
                        </label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <p className="text-danger text-mono text-center mb-4" style={{ fontSize: 'var(--font-sm)' }}>
                            ⚠ {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'AUTHENTICATING...' : 'LOGIN →'}
                    </button>
                </form>
            </div>
        </main>
    )
}
