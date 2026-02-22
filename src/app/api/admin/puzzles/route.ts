import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { round_number, round_name, master_password, clues } = await request.json()

        if (!round_name || !master_password || !clues || clues.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Create puzzle
        const { data: puzzle, error: puzzleError } = await supabase
            .from('puzzles')
            .insert({
                round_number: round_number || 1,
                round_name,
                master_password: master_password.toUpperCase(),
                is_live: false,
                is_active: false,
            })
            .select()
            .single()

        if (puzzleError || !puzzle) {
            return NextResponse.json({ error: puzzleError?.message || 'Failed to create puzzle' }, { status: 500 })
        }

        // Create clues with 3-tier hints and image
        const clueRows = clues.map((c: {
            character_position: number
            clue_text: string
            expected_answer: string
            max_tries?: number
            lockout_duration_seconds?: number
            hint_text?: string
            hint_1?: string
            hint_2?: string
            hint_3?: string
            image_url?: string
        }) => ({
            puzzle_id: puzzle.id,
            character_position: c.character_position,
            clue_text: c.clue_text,
            expected_answer: c.expected_answer.toUpperCase(),
            max_tries: c.max_tries || 3,
            lockout_duration_seconds: c.lockout_duration_seconds || 30,
            hint_text: c.hint_1 || c.hint_text || '',
            hint_1: c.hint_1 || c.hint_text || '',
            hint_2: c.hint_2 || '',
            hint_3: c.hint_3 || '',
            image_url: c.image_url || '',
        }))

        const { error: cluesError } = await supabase.from('clues').insert(clueRows)

        if (cluesError) {
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

export async function DELETE(request: NextRequest) {
    try {
        const { puzzle_id } = await request.json()
        if (!puzzle_id) {
            return NextResponse.json({ error: 'Missing puzzle_id' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Delete clues first
        await supabase.from('clues').delete().eq('puzzle_id', puzzle_id)
        // Delete leaderboard entries
        await supabase.from('leaderboard').delete().eq('puzzle_id', puzzle_id)
        // Delete puzzle
        const { error } = await supabase.from('puzzles').delete().eq('id', puzzle_id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
