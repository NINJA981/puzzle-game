import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { round_number, round_name, master_password, clues } = await request.json()

        if (!master_password || !clues || clues.length === 0) {
            return NextResponse.json({ error: 'Missing puzzle data' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Create puzzle
        const { data: puzzle, error: puzzleError } = await supabase
            .from('puzzles')
            .insert({
                round_number: round_number || 1,
                round_name: round_name || 'Round',
                master_password,
                is_live: false,
                is_active: false,
            })
            .select()
            .single()

        if (puzzleError || !puzzle) {
            return NextResponse.json({ error: puzzleError?.message || 'Failed to create puzzle' }, { status: 500 })
        }

        // Create clues
        const clueRows = clues.map((clue: { character_position: number; clue_text: string; hint_text: string; expected_answer: string; max_tries: number; lockout_duration_seconds: number }) => ({
            puzzle_id: puzzle.id,
            character_position: clue.character_position,
            clue_text: clue.clue_text,
            hint_text: clue.hint_text || '',
            expected_answer: clue.expected_answer,
            max_tries: clue.max_tries || 3,
            lockout_duration_seconds: clue.lockout_duration_seconds || 30,
        }))

        const { error: cluesError } = await supabase.from('clues').insert(clueRows)

        if (cluesError) {
            // Rollback puzzle
            await supabase.from('puzzles').delete().eq('id', puzzle.id)
            return NextResponse.json({ error: cluesError.message }, { status: 500 })
        }

        return NextResponse.json({ puzzle })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function GET() {
    try {
        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('puzzles')
            .select('*, clues(*)')
            .order('round_number', { ascending: true })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ puzzles: data })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
