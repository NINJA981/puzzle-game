import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateJoinCode } from '@/lib/utils'

export async function POST(request: NextRequest) {
    try {
        const { team_id } = await request.json()

        if (!team_id) {
            return NextResponse.json({ error: 'Missing team_id' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Delete compromised team
        await supabase.from('teams').delete().eq('id', team_id)

        // Generate new code
        const newCode = generateJoinCode()
        const { data: newTeam, error } = await supabase
            .from('teams')
            .insert({
                join_code: newCode,
                status: 'UNUSED',
                team_name: '',
                hint_tokens: 3,
                current_character_index: 0,
            })
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ new_code: newCode, team: newTeam })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
