import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { team_id, powerup_id } = await request.json()

        if (!team_id || !powerup_id) {
            return NextResponse.json({ error: 'Missing team_id or powerup_id' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Get active puzzle to scope powerups to current round
        const { data: puzzle } = await supabase
            .from('puzzles')
            .select('id')
            .eq('is_active', true)
            .single()

        if (!puzzle) {
            return NextResponse.json({ error: 'No active puzzle' }, { status: 404 })
        }

        // Find the team powerup scoped to current puzzle
        const { data: tp, error: tpError } = await supabase
            .from('team_powerups')
            .select('*, powerup:powerups(*)')
            .eq('team_id', team_id)
            .eq('powerup_id', powerup_id)
            .eq('puzzle_id', puzzle.id)
            .eq('is_used', false)
            .single()

        if (tpError || !tp) {
            return NextResponse.json({ error: 'Powerup not available or already used' }, { status: 404 })
        }

        // Mark as used
        await supabase
            .from('team_powerups')
            .update({ is_used: true, used_at: new Date().toISOString() })
            .eq('id', tp.id)

        // Apply effect based on powerup type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const powerup = tp.powerup as any
        const effect = powerup?.effect || {}
        let effectResult = {}

        switch (effect.type) {
            case 'extra_try': {
                // Retry Shield: reset tries on current locked character
                const { data: progress } = await supabase
                    .from('team_progress')
                    .select('*')
                    .eq('team_id', team_id)
                    .eq('completed', false)
                    .limit(1)
                    .single()

                if (progress) {
                    await supabase
                        .from('team_progress')
                        .update({ tries_used: Math.max(0, progress.tries_used - 1) })
                        .eq('id', progress.id)
                }
                effectResult = { message: '+1 extra try added' }
                break
            }
            case 'free_hint': {
                // Free Hint: add 1 hint token
                const { data: team } = await supabase.from('teams').select('hint_tokens').eq('id', team_id).single()
                if (team) {
                    await supabase.from('teams').update({ hint_tokens: team.hint_tokens + 1 }).eq('id', team_id)
                }
                effectResult = { message: '+1 free hint token' }
                break
            }
            case 'survive_elimination': {
                // Anti-Eliminate: handled in verify-guess (presence check)
                effectResult = { message: 'Anti-Eliminate shield active' }
                break
            }
            default: {
                effectResult = { message: `${powerup?.name || 'Powerup'} activated` }
            }
        }

        return NextResponse.json({
            success: true,
            powerup_name: powerup?.name,
            ...effectResult,
        })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
