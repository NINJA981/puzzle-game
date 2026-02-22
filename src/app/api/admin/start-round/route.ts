import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient as createRealtimeClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const { puzzle_id } = await request.json()

        if (!puzzle_id) {
            return NextResponse.json({ error: 'Missing puzzle_id' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Deactivate all puzzles
        await supabase.from('puzzles').update({ is_active: false, is_live: false }).neq('id', '00000000-0000-0000-0000-000000000000')

        // Set this puzzle as active and live
        const { error } = await supabase
            .from('puzzles')
            .update({ is_active: true, is_live: true })
            .eq('id', puzzle_id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const now = new Date().toISOString()

        // Reset all active teams for new round and set round_start_time
        await supabase
            .from('teams')
            .update({
                current_character_index: 0,
                completed_at: null,
                current_puzzle_id: puzzle_id,
                round_start_time: now,
                is_eliminated: false,
                eliminated_at: null,
                final_answer_submitted: false,
                hints_used_total: 0,
            })
            .eq('status', 'ACTIVE')
            .eq('is_qualified', true)

        // Clear previous progress for these teams
        const { data: activeTeams } = await supabase
            .from('teams')
            .select('id')
            .eq('status', 'ACTIVE')
            .eq('is_qualified', true)

        if (activeTeams && activeTeams.length > 0) {
            const teamIds = activeTeams.map((t) => t.id)
            await supabase.from('team_progress').delete().in('team_id', teamIds)
        }

        // Broadcast game start via Realtime
        const realtimeClient = createRealtimeClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const channel = realtimeClient.channel('game_state')
        await channel.subscribe()
        await channel.send({
            type: 'broadcast',
            event: 'game_event',
            payload: { type: 'GAME_START', puzzle_id },
        })
        realtimeClient.removeChannel(channel)

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
