import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { team_id, character_position, hint_level } = await request.json()

        if (!team_id) {
            return NextResponse.json({ error: 'Missing team_id' }, { status: 400 })
        }

        const level = hint_level || 1
        if (level < 1 || level > 3) {
            return NextResponse.json({ error: 'hint_level must be 1, 2, or 3' }, { status: 400 })
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

        // Get clue for the specified position (or current index for backward compat)
        const charPos = character_position !== undefined ? character_position : team.current_character_index

        const { data: clue } = await supabase
            .from('clues')
            .select('hint_text, hint_1, hint_2, hint_3')
            .eq('puzzle_id', puzzle.id)
            .eq('character_position', charPos)
            .single()

        if (!clue) {
            return NextResponse.json({ error: 'Clue not found' }, { status: 404 })
        }

        // Get the appropriate hint level
        let hintText = ''
        if (level === 1) hintText = clue.hint_1 || clue.hint_text || 'No hint available.'
        else if (level === 2) hintText = clue.hint_2 || 'No level 2 hint available.'
        else if (level === 3) hintText = clue.hint_3 || 'No level 3 hint available.'

        // Deduct token and track usage
        await supabase
            .from('teams')
            .update({
                hint_tokens: team.hint_tokens - 1,
                hints_used_total: (team.hints_used_total || 0) + 1,
            })
            .eq('id', team_id)

        return NextResponse.json({
            success: true,
            hint_text: hintText,
            hint_level: level,
            tokens_remaining: team.hint_tokens - 1,
        })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
