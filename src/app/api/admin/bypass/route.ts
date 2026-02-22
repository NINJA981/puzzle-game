import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { team_id } = await request.json()

        if (!team_id) {
            return NextResponse.json({ error: 'Missing team_id' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Get current index
        const { data: team } = await supabase
            .from('teams')
            .select('current_character_index')
            .eq('id', team_id)
            .single()

        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 })
        }

        // Bump to next character
        const { error } = await supabase
            .from('teams')
            .update({ current_character_index: team.current_character_index + 1 })
            .eq('id', team_id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, new_index: team.current_character_index + 1 })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
