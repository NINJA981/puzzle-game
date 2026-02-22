import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { code, team_name } = await request.json()

        if (!code || code.length !== 6) {
            return NextResponse.json({ error: 'Invalid code format' }, { status: 400 })
        }

        const supabase = createServiceClient()

        const { data: team, error: fetchError } = await supabase
            .from('teams')
            .select('id, status')
            .eq('join_code', code.toUpperCase())
            .single()

        if (fetchError || !team) {
            return NextResponse.json({ error: 'Invalid code. Check with your organizer.' }, { status: 404 })
        }

        if (team.status === 'ACTIVE') {
            return NextResponse.json(
                { error: 'This code is already in use on another device.' },
                { status: 409 }
            )
        }

        const { error: updateError } = await supabase
            .from('teams')
            .update({
                status: 'ACTIVE',
                team_name: team_name || `Team ${code}`,
            })
            .eq('id', team.id)

        if (updateError) {
            return NextResponse.json({ error: 'Failed to activate session' }, { status: 500 })
        }

        return NextResponse.json({ team_id: team.id })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
