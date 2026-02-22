import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST() {
    try {
        const supabase = createServiceClient()

        // Clear all progress
        await supabase.from('team_progress').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('team_powerups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('leaderboard').delete().neq('id', '00000000-0000-0000-0000-000000000000')

        // Reset all teams to initial state (keep codes & names)
        await supabase
            .from('teams')
            .update({
                current_character_index: 0,
                completed_at: null,
                is_eliminated: false,
                eliminated_at: null,
                round_start_time: null,
                hints_used_total: 0,
                final_answer_submitted: false,
                selected_powerups: [],
                hint_tokens: 3,
                is_qualified: true,
            })
            .eq('status', 'ACTIVE')

        // Deactivate all puzzles
        await supabase.from('puzzles').update({ is_live: false, is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')

        return NextResponse.json({ success: true, message: 'Game reset. All progress cleared.' })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
