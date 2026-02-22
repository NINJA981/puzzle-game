'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { GameBroadcast } from '@/lib/types'

export default function LobbyPage() {
    const [teamCount, setTeamCount] = useState(0)
    const [teamId, setTeamId] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const id = localStorage.getItem('team_id')
        if (!id) {
            router.push('/')
            return
        }
        setTeamId(id)

        const channel = supabase.channel('game_state', {
            config: { presence: { key: id } },
        })

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                setTeamCount(Object.keys(state).length)
            })
            .on('broadcast', { event: 'game_event' }, ({ payload }: { payload: GameBroadcast }) => {
                const broadcast = payload
                if (broadcast.type === 'GAME_START') {
                    router.push('/play')
                }
            })
            .subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ team_id: id, joined_at: new Date().toISOString() })
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [router, supabase])

    return (
        <main className="page-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div className="text-center animate-fade-in-up" style={{ width: '100%', maxWidth: 400 }}>
                {/* Pulsing Ring */}
                <div className="flex-center mb-6">
                    <div
                        className="animate-pulse"
                        style={{
                            width: 120,
                            height: 120,
                            borderRadius: '50%',
                            border: '2px solid var(--neon-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--glow-md), inset var(--glow-sm)',
                        }}
                    >
                        <div
                            style={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                border: '1px solid var(--border-glow)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                            }}
                        >
                            <span
                                className="text-neon glow-text"
                                style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, lineHeight: 1 }}
                            >
                                {teamCount}
                            </span>
                            <span
                                className="text-muted text-mono"
                                style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                            >
                                teams
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status */}
                <h1
                    className="text-mono"
                    style={{
                        fontSize: 'var(--font-lg)',
                        fontWeight: 600,
                        color: 'var(--neon-secondary)',
                        marginBottom: 'var(--space-2)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                    }}
                >
                    Waiting for Admin...
                </h1>

                <p
                    className="text-muted"
                    style={{ fontSize: 'var(--font-sm)', maxWidth: 280, margin: '0 auto', lineHeight: 1.6 }}
                >
                    The game will start when the administrator launches the round. Stay on this screen.
                </p>

                {/* Connection indicator */}
                <div
                    className="flex-center gap-2 mt-auto"
                    style={{ marginTop: 'var(--space-7)' }}
                >
                    <div
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'var(--neon-success)',
                            boxShadow: '0 0 6px var(--neon-success)',
                            animation: 'neonPulse 2s ease-in-out infinite',
                        }}
                    />
                    <span className="text-mono text-muted" style={{ fontSize: 'var(--font-xs)' }}>
                        CONNECTED
                    </span>
                </div>
            </div>
        </main>
    )
}
