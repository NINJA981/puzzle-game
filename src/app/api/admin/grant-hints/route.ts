import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { amount } = await request.json()
        const tokensToAdd = Math.min(Math.max(parseInt(amount) || 1, 1), 10)

        const supabase = createServiceClient()

        // Get all active teams
        const { data: teams } = await supabase
            .from('teams')
            .select('id, hint_tokens')
            .eq('status', 'ACTIVE')

        if (!teams || teams.length === 0) {
            return NextResponse.json({ error: 'No active teams' }, { status: 404 })
        }

        // Update each team
        const updates = teams.map((team) =>
            supabase
                .from('teams')
                .update({ hint_tokens: team.hint_tokens + tokensToAdd })
                .eq('id', team.id)
        )

        await Promise.all(updates)

        return NextResponse.json({ success: true, teams_updated: teams.length, tokens_added: tokensToAdd })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
