import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { team_id, guess } = await request.json()

        if (!team_id || !guess) {
            return NextResponse.json({ error: 'Missing team_id or guess' }, { status: 400 })
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

        // Get active puzzle
        const { data: puzzle, error: puzzleError } = await supabase
            .from('puzzles')
            .select('*')
            .eq('is_active', true)
            .single()

        if (puzzleError || !puzzle) {
            return NextResponse.json({ error: 'No active puzzle' }, { status: 404 })
        }

        // Get current clue
        const { data: clue, error: clueError } = await supabase
            .from('clues')
            .select('*')
            .eq('puzzle_id', puzzle.id)
            .eq('character_position', team.current_character_index)
            .single()

        if (clueError || !clue) {
            return NextResponse.json({ error: 'Clue not found' }, { status: 404 })
        }

        // Get or create progress
        let { data: progress } = await supabase
            .from('team_progress')
            .select('*')
            .eq('team_id', team_id)
            .eq('clue_id', clue.id)
            .single()

        if (!progress) {
            const { data: newProgress } = await supabase
                .from('team_progress')
                .insert({ team_id, clue_id: clue.id, tries_used: 0 })
                .select()
                .single()
            progress = newProgress
        }

        if (!progress) {
            return NextResponse.json({ error: 'Failed to track progress' }, { status: 500 })
        }

        // Check lockout
        if (progress.locked_until) {
            const lockEnd = new Date(progress.locked_until)
            if (lockEnd > new Date()) {
                return NextResponse.json({
                    success: false,
                    locked_until: progress.locked_until,
                    tries_remaining: 0,
                })
            }
            // Lockout expired — reset
            await supabase
                .from('team_progress')
                .update({ locked_until: null, tries_used: 0 })
                .eq('id', progress.id)
            progress.tries_used = 0
            progress.locked_until = null
        }

        const isCorrect = guess.trim().toUpperCase() === clue.expected_answer.trim().toUpperCase()

        if (isCorrect) {
            // Mark progress complete
            await supabase
                .from('team_progress')
                .update({ completed: true })
                .eq('id', progress.id)

            const nextIndex = team.current_character_index + 1
            const totalChars = puzzle.master_password.length

            if (nextIndex >= totalChars) {
                // Round complete!
                await supabase
                    .from('teams')
                    .update({
                        current_character_index: nextIndex,
                        completed_at: new Date().toISOString(),
                    })
                    .eq('id', team_id)

                return NextResponse.json({
                    success: true,
                    completed_round: true,
                    next_character_index: nextIndex,
                })
            }

            // Advance to next character
            await supabase
                .from('teams')
                .update({ current_character_index: nextIndex })
                .eq('id', team_id)

            return NextResponse.json({
                success: true,
                completed_round: false,
                next_character_index: nextIndex,
            })
        }

        // Wrong guess
        const newTriesUsed = progress.tries_used + 1
        const triesRemaining = clue.max_tries - newTriesUsed

        if (triesRemaining <= 0) {
            // Lock out
            const lockUntil = new Date(
                Date.now() + clue.lockout_duration_seconds * 1000
            ).toISOString()

            await supabase
                .from('team_progress')
                .update({ tries_used: newTriesUsed, locked_until: lockUntil })
                .eq('id', progress.id)

            return NextResponse.json({
                success: false,
                tries_remaining: 0,
                locked_until: lockUntil,
            })
        }

        await supabase
            .from('team_progress')
            .update({ tries_used: newTriesUsed })
            .eq('id', progress.id)

        return NextResponse.json({
            success: false,
            tries_remaining: triesRemaining,
        })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
