'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { GameBroadcast } from '@/lib/types'

export default function LobbyPage() {
    const [teamCount, setTeamCount] = useState(0)
    const [connected, setConnected] = useState(false)
    const [teamName, setTeamName] = useState('')
    const supabaseRef = useRef(createClient())
    const router = useRouter()

    useEffect(() => {
        const id = localStorage.getItem('team_id')
        if (!id) { router.push('/'); return }

        const name = localStorage.getItem('team_name')
        setTeamName(name || '')

        const supabase = supabaseRef.current
        const channel = supabase.channel('game_state')

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                setTeamCount(Object.keys(state).length)
            })
            .on('broadcast', { event: 'game_event' }, ({ payload }: { payload: GameBroadcast }) => {
                if (payload.type === 'GAME_START') {
                    router.push('/draft')
                }
                if (payload.type === 'GAME_END') {
                    router.push('/leaderboard')
                }
                if (payload.type === 'ROUND_ADVANCE') {
                    router.push('/draft')
                }
            })
            .subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    setConnected(true)
                    await channel.track({
                        team_id: id,
                        joined_at: new Date().toISOString(),
                    })
                }
            })

        return () => { supabase.removeChannel(channel) }
    }, [router])

    return (
        <main className="page-container flex-center" style={{ textAlign: 'center' }}>
            <div className="animate-fade-in-up">
                <h1
                    className="glow-text"
                    style={{
                        fontSize: 'var(--font-3xl)',
                        fontWeight: 700,
                        marginBottom: 'var(--space-2)',
                    }}
                >
                    DECODE
                </h1>
                <p
                    className="text-mono text-muted"
                    style={{ fontSize: 'var(--font-sm)', marginBottom: 'var(--space-6)' }}
                >
                    ENTER YOUR TEAM ACCESS CODE
                </p>

                <div
                    className="card card-glow"
                    style={{
                        padding: 'var(--space-6)',
                        maxWidth: 400,
                        margin: '0 auto',
                        marginBottom: 'var(--space-5)',
                    }}
                >
                    <div
                        className="text-mono"
                        style={{
                            fontSize: 'var(--font-3xl)',
                            fontWeight: 700,
                            color: 'var(--neon-primary)',
                            marginBottom: 'var(--space-2)',
                        }}
                    >
                        {teamCount}
                    </div>
                    <p className="text-mono text-muted" style={{ fontSize: 'var(--font-sm)' }}>
                        TEAMS CONNECTED
                    </p>
                </div>

                <div
                    className="animate-pulse"
                    style={{
                        marginBottom: 'var(--space-4)',
                        fontSize: 'var(--font-lg)',
                        fontFamily: 'var(--font-mono)',
                    }}
                >
                    WAITING FOR ADMIN...
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-2)',
                    }}
                >
                    <div
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: connected ? 'var(--neon-success)' : 'var(--neon-danger)',
                        }}
                    />
                    <span
                        className="text-mono text-muted"
                        style={{ fontSize: 'var(--font-xs)' }}
                    >
                        {connected ? 'CONNECTED' : 'CONNECTING...'}
                    </span>
                </div>

                {teamName && (
                    <p className="text-muted" style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-xs)' }}>
                        {teamName}
                    </p>
                )}
            </div>
        </main>
    )
}
