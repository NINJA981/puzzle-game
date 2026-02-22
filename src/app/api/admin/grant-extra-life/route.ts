import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient as createRealtimeClient } from '@supabase/supabase-js'

export async function POST() {
    try {
        const supabase = createServiceClient()

        // Revive all eliminated teams
        const { data: eliminated } = await supabase
            .from('teams')
            .select('id')
            .eq('is_eliminated', true)
            .eq('status', 'ACTIVE')

        if (!eliminated || eliminated.length === 0) {
            return NextResponse.json({ success: true, message: 'No eliminated teams to revive', revived: 0 })
        }

        // Reset elimination status
        await supabase
            .from('teams')
            .update({ is_eliminated: false, eliminated_at: null })
            .eq('is_eliminated', true)
            .eq('status', 'ACTIVE')

        // Reset tries on all locked progress entries for these teams
        const teamIds = eliminated.map((t) => t.id)
        await supabase
            .from('team_progress')
            .update({ tries_used: 0, locked_until: null })
            .in('team_id', teamIds)

        // Broadcast extra life event
        const realtimeClient = createRealtimeClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const channel = realtimeClient.channel('game_state')
        await channel.subscribe()
        await channel.send({
            type: 'broadcast',
            event: 'game_event',
            payload: { type: 'EXTRA_LIFE' },
        })
        realtimeClient.removeChannel(channel)

        return NextResponse.json({ success: true, message: `Revived ${eliminated.length} teams`, revived: eliminated.length })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
