import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { unused_only } = await request.json().catch(() => ({ unused_only: false }))
        const supabase = createServiceClient()

        if (unused_only) {
            const { error } = await supabase.from('teams').delete().eq('status', 'UNUSED')
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json({ success: true, message: 'Unused codes deleted' })
        }

        // Delete all related data first
        await supabase.from('team_powerups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('team_progress').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('leaderboard').delete().neq('id', '00000000-0000-0000-0000-000000000000')

        const { error } = await supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ success: true, message: 'All codes and team data deleted' })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
