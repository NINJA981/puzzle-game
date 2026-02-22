import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { team_id } = await request.json()

        if (!team_id) {
            return NextResponse.json({ error: 'Missing team_id' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Get team
        const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('*')
            .eq('id', team_id)
            .single()

        if (teamError || !team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 })
        }

        if (team.hint_tokens <= 0) {
            return NextResponse.json(
                { success: false, error: 'No hint tokens remaining' },
                { status: 403 }
            )
        }

        // Get active puzzle
        const { data: puzzle } = await supabase
            .from('puzzles')
            .select('*')
            .eq('is_active', true)
            .single()

        if (!puzzle) {
            return NextResponse.json({ error: 'No active puzzle' }, { status: 404 })
        }

        // Get current clue
        const { data: clue } = await supabase
            .from('clues')
            .select('hint_text')
            .eq('puzzle_id', puzzle.id)
            .eq('character_position', team.current_character_index)
            .single()

        if (!clue) {
            return NextResponse.json({ error: 'Clue not found' }, { status: 404 })
        }

        // Deduct token
        await supabase
            .from('teams')
            .update({ hint_tokens: team.hint_tokens - 1 })
            .eq('id', team_id)

        return NextResponse.json({
            success: true,
            hint_text: clue.hint_text || 'No hint available for this clue.',
            tokens_remaining: team.hint_tokens - 1,
        })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
