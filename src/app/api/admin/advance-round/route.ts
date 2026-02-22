import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient as createRealtimeClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const { team_ids, top_n, puzzle_id } = await request.json()

        if (!puzzle_id) {
            return NextResponse.json({ error: 'Missing puzzle_id for next round' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Determine which teams advance
        let qualifiedIds: string[] = []

        if (team_ids && team_ids.length > 0) {
            // Manual selection
            qualifiedIds = team_ids
        } else if (top_n) {
            // Auto-select top N from leaderboard
            const { data: leaderboard } = await supabase
                .from('leaderboard')
                .select('team_id')
                .order('rank', { ascending: true })
                .limit(top_n)

            qualifiedIds = leaderboard?.map((e) => e.team_id) || []
        } else {
            return NextResponse.json({ error: 'Provide team_ids or top_n' }, { status: 400 })
        }

        if (qualifiedIds.length === 0) {
            return NextResponse.json({ error: 'No teams to advance' }, { status: 400 })
        }

        // Mark non-qualifying teams
        const { data: allActive } = await supabase
            .from('teams')
            .select('id')
            .eq('status', 'ACTIVE')

        const allActiveIds = allActive?.map((t) => t.id) || []
        const eliminatedIds = allActiveIds.filter((id) => !qualifiedIds.includes(id))

        if (eliminatedIds.length > 0) {
            await supabase
                .from('teams')
                .update({ is_qualified: false, is_eliminated: true, eliminated_at: new Date().toISOString() })
                .in('id', eliminatedIds)
        }

        // Mark qualifying teams
        await supabase
            .from('teams')
            .update({ is_qualified: true, is_eliminated: false, eliminated_at: null })
            .in('id', qualifiedIds)

        // Broadcast round advance
        const realtimeClient = createRealtimeClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const channel = realtimeClient.channel('game_state')
        await channel.subscribe()
        await channel.send({
            type: 'broadcast',
            event: 'game_event',
            payload: { type: 'ROUND_ADVANCE', puzzle_id },
        })
        realtimeClient.removeChannel(channel)

        return NextResponse.json({
            success: true,
            qualified: qualifiedIds.length,
            eliminated: eliminatedIds.length,
        })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
