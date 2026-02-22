import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { team_id, guess, character_position } = await request.json()

        if (!team_id || !guess || character_position === undefined) {
            return NextResponse.json({ error: 'Missing team_id, guess, or character_position' }, { status: 400 })
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

        if (team.is_eliminated) {
            return NextResponse.json({ error: 'Team is eliminated', is_eliminated: true }, { status: 403 })
        }

        if (team.final_answer_submitted) {
            return NextResponse.json({ error: 'Final answer already submitted' }, { status: 403 })
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

        // Get clue for the specific character position (non-sequential)
        const { data: clue, error: clueError } = await supabase
            .from('clues')
            .select('*')
            .eq('puzzle_id', puzzle.id)
            .eq('character_position', character_position)
            .single()

        if (clueError || !clue) {
            return NextResponse.json({ error: 'Clue not found' }, { status: 404 })
        }

        // Get or create progress for this specific character
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

        // Already completed this character
        if (progress.completed) {
            return NextResponse.json({ success: true, already_completed: true, tries_remaining: clue.max_tries - progress.tries_used })
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
            await supabase
                .from('team_progress')
                .update({ locked_until: null, tries_used: 0 })
                .eq('id', progress.id)
            progress.tries_used = 0
        }

        const isCorrect = guess.trim().toUpperCase() === clue.expected_answer.trim().toUpperCase()

        if (isCorrect) {
            await supabase
                .from('team_progress')
                .update({ completed: true })
                .eq('id', progress.id)

            // Check if ALL characters are now completed
            const { data: allClues } = await supabase
                .from('clues')
                .select('id')
                .eq('puzzle_id', puzzle.id)

            const { data: completedProgress } = await supabase
                .from('team_progress')
                .select('clue_id')
                .eq('team_id', team_id)
                .eq('completed', true)

            const totalChars = allClues?.length || 0
            const completedChars = (completedProgress?.length || 0)
            const allDone = completedChars >= totalChars

            // Update current_character_index to reflect progress
            await supabase
                .from('teams')
                .update({ current_character_index: completedChars })
                .eq('id', team_id)

            return NextResponse.json({
                success: true,
                completed_round: allDone,
                completed_chars: completedChars,
                total_chars: totalChars,
            })
        }

        // Wrong guess
        const newTriesUsed = progress.tries_used + 1
        const triesRemaining = clue.max_tries - newTriesUsed

        if (triesRemaining <= 0) {
            // Check if team has anti-eliminate powerup
            const { data: antiElim } = await supabase
                .from('team_powerups')
                .select('id')
                .eq('team_id', team_id)
                .eq('is_used', false)
                .single()

            // Lock out with duration
            const lockUntil = new Date(
                Date.now() + clue.lockout_duration_seconds * 1000
            ).toISOString()

            await supabase
                .from('team_progress')
                .update({ tries_used: newTriesUsed, locked_until: lockUntil })
                .eq('id', progress.id)

            // ELIMINATE the team — they've exhausted all tries on this character
            if (!antiElim) {
                await supabase
                    .from('teams')
                    .update({ is_eliminated: true, eliminated_at: new Date().toISOString() })
                    .eq('id', team_id)

                return NextResponse.json({
                    success: false,
                    tries_remaining: 0,
                    locked_until: lockUntil,
                    is_eliminated: true,
                })
            }

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
