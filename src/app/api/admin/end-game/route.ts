import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient as createRealtimeClient } from '@supabase/supabase-js'
import { calculateScore } from '@/lib/utils'

export async function POST() {
    try {
        const supabase = createServiceClient()

        // Get active puzzle
        const { data: puzzle } = await supabase
            .from('puzzles')
            .select('*')
            .eq('is_active', true)
            .single()

        if (!puzzle) {
            return NextResponse.json({ error: 'No active puzzle' }, { status: 404 })
        }

        // Stop the game
        await supabase
            .from('puzzles')
            .update({ is_live: false })
            .eq('id', puzzle.id)

        // Get all active teams and calculate scores
        const { data: teams } = await supabase
            .from('teams')
            .select('*')
            .eq('status', 'ACTIVE')

        if (teams) {
            const leaderboardRows = teams.map((team) => {
                const isCompleted = !!team.completed_at
                const startTime = team.round_start_time ? new Date(team.round_start_time).getTime() : 0
                const endTime = team.completed_at
                    ? new Date(team.completed_at).getTime()
                    : Date.now()
                const timeSeconds = startTime > 0 ? Math.floor((endTime - startTime) / 1000) : 9999

                return {
                    team_id: team.id,
                    puzzle_id: puzzle.id,
                    time_seconds: timeSeconds,
                    hints_used: team.hints_used_total || 0,
                    score: isCompleted ? calculateScore(timeSeconds, team.hints_used_total || 0) : 0,
                    completed: isCompleted,
                }
            })

            // Sort by score descending, assign ranks
            leaderboardRows.sort((a, b) => b.score - a.score)
            leaderboardRows.forEach((row, i) => {
                ; (row as Record<string, unknown>).rank = i + 1
            })

            // Upsert leaderboard
            await supabase
                .from('leaderboard')
                .upsert(leaderboardRows, { onConflict: 'team_id,puzzle_id' })
        }

        // Broadcast game end
        const realtimeClient = createRealtimeClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const channel = realtimeClient.channel('game_state')
        await channel.subscribe()
        await channel.send({
            type: 'broadcast',
            event: 'game_event',
            payload: { type: 'GAME_END', puzzle_id: puzzle.id },
        })
        realtimeClient.removeChannel(channel)

        return NextResponse.json({ success: true, message: 'Game ended. Leaderboard calculated.' })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
