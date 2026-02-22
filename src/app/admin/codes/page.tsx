'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Team } from '@/lib/types'

export default function CodesPage() {
    const [count, setCount] = useState('50')
    const [generating, setGenerating] = useState(false)
    const [teams, setTeams] = useState<Team[]>([])
    const [loading, setLoading] = useState(true)
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current

    useEffect(() => {
        fetchTeams()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function fetchTeams() {
        const { data } = await supabase
            .from('teams')
            .select('*')
            .order('created_at', { ascending: false })

        if (data) setTeams(data)
        setLoading(false)
    }

    async function handleGenerate() {
        setGenerating(true)
        try {
            const res = await fetch('/api/admin/generate-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count: parseInt(count) }),
            })

            if (res.ok) {
                fetchTeams()
            }
        } catch {
            // Handle error
        } finally {
            setGenerating(false)
        }
    }

    function handlePrint() {
        const unusedTeams = teams.filter((t) => t.status === 'UNUSED')
        const printContent = unusedTeams.map((t) => t.join_code).join('\n')
        const w = window.open('', '_blank')
        if (!w) return

        w.document.write(`
      <html>
        <head>
          <title>Team Codes</title>
          <style>
            body { font-family: monospace; padding: 40px; }
            .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
            .code { padding: 12px; border: 2px solid #333; text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 3px; }
          </style>
        </head>
        <body>
          <h1>Team Access Codes</h1>
          <p>${unusedTeams.length} unused codes</p>
          <div class="grid">
            ${unusedTeams.map((t) => `<div class="code">${t.join_code}</div>`).join('')}
          </div>
        </body>
      </html>
    `)
        w.document.close()
        w.print()
    }

    const unusedCount = teams.filter((t) => t.status === 'UNUSED').length
    const activeCount = teams.filter((t) => t.status === 'ACTIVE').length

    return (
        <div>
            <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
                Team Codes
            </h1>

            {/* Generator */}
            <div className="card card-glow" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 className="text-mono" style={{ fontSize: 'var(--font-base)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                    Bulk Code Generator
                </h2>

                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label
                            className="text-mono text-muted"
                            style={{ fontSize: 'var(--font-xs)', display: 'block', marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}
                        >
                            How many codes?
                        </label>
                        <input
                            type="number"
                            className="input"
                            value={count}
                            onChange={(e) => setCount(e.target.value)}
                            min="1"
                            max="500"
                            style={{ maxWidth: 120 }}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={handleGenerate}
                        disabled={generating}
                    >
                        {generating ? 'GENERATING...' : 'GENERATE'}
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={handlePrint}
                        disabled={unusedCount === 0}
                    >
                        🖨 PRINT
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <span className="badge badge-info">Total: {teams.length}</span>
                <span className="badge badge-warning">Unused: {unusedCount}</span>
                <span className="badge badge-success">Active: {activeCount}</span>
            </div>

            {/* Codes Table */}
            {loading ? (
                <div className="text-center text-muted" style={{ padding: 'var(--space-7)' }}>Loading...</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-sm)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                <th style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', fontSize: 'var(--font-xs)' }}>Code</th>
                                <th style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', fontSize: 'var(--font-xs)' }}>Team Name</th>
                                <th style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', fontSize: 'var(--font-xs)' }}>Status</th>
                                <th style={{ padding: 'var(--space-3)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', fontSize: 'var(--font-xs)' }}>Hints</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map((team) => (
                                <tr key={team.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                    <td style={{ padding: 'var(--space-3)', letterSpacing: '0.1em', color: 'var(--neon-secondary)' }}>
                                        {team.join_code}
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>
                                        {team.team_name || '—'}
                                    </td>
                                    <td style={{ padding: 'var(--space-3)' }}>
                                        <span className={`badge ${team.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                                            {team.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>
                                        {team.hint_tokens}
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
