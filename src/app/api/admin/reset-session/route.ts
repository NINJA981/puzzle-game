import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { team_id } = await request.json()

        if (!team_id) {
            return NextResponse.json({ error: 'Missing team_id' }, { status: 400 })
        }

        const supabase = createServiceClient()

        const { error } = await supabase
            .from('teams')
            .update({ status: 'UNUSED' })
            .eq('id', team_id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
