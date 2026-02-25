import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = createServiceClient()

        // Get active puzzle config
        const { data: puzzle } = await supabase
            .from('puzzles')
            .select('id, max_powerups')
            .eq('is_active', true)
            .single()

        const { data, error } = await supabase
            .from('powerups')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({
            powerups: data,
            max_powerups: puzzle?.max_powerups ?? 3,
        })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { team_id, powerup_ids, puzzle_id } = await request.json()

        if (!team_id || !powerup_ids || !Array.isArray(powerup_ids)) {
            return NextResponse.json({ error: 'Missing team_id or powerup_ids' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Get active puzzle if not provided
        let activePuzzleId = puzzle_id
        let maxPowerups = 3
        const { data: puzzle } = await supabase
            .from('puzzles')
            .select('id, max_powerups')
            .eq('is_active', true)
            .single()

        if (puzzle) {
            if (!activePuzzleId) activePuzzleId = puzzle.id
            maxPowerups = puzzle.max_powerups ?? 3
        }

        if (!activePuzzleId) {
            return NextResponse.json({ error: 'No active puzzle' }, { status: 404 })
        }

        // Enforce per-round powerup limit
        if (powerup_ids.length > maxPowerups) {
            return NextResponse.json(
                { error: `Cannot select more than ${maxPowerups} powerups for this round` },
                { status: 400 }
            )
        }

        // Check if team already selected powerups for this puzzle
        const { data: existing } = await supabase
            .from('team_powerups')
            .select('id')
            .eq('team_id', team_id)
            .eq('puzzle_id', activePuzzleId)

        if (existing && existing.length > 0) {
            return NextResponse.json({ error: 'Powerups already selected for this round' }, { status: 409 })
        }

        // Insert selections
        const rows = powerup_ids.map((pid: string) => ({
            team_id,
            powerup_id: pid,
            puzzle_id: activePuzzleId,
        }))

        const { error } = await supabase.from('team_powerups').insert(rows)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Save to team record
        await supabase
            .from('teams')
            .update({ selected_powerups: powerup_ids })
            .eq('id', team_id)

        return NextResponse.json({ success: true, count: powerup_ids.length })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
