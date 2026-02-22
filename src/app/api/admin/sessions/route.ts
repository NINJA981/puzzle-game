import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { name, total_rounds } = await request.json()

        if (!name) {
            return NextResponse.json({ error: 'Missing session name' }, { status: 400 })
        }

        const supabase = createServiceClient()

        const { data, error } = await supabase
            .from('game_sessions')
            .insert({
                name,
                total_rounds: total_rounds || 1,
                status: 'SETUP',
                current_round: 0,
            })
            .select()
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ session: data })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function GET() {
    try {
        const supabase = createServiceClient()
        const { data, error } = await supabase
            .from('game_sessions')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ sessions: data })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { session_id, status } = await request.json()

        if (!session_id) {
            return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
        }

        const supabase = createServiceClient()

        const { error } = await supabase
            .from('game_sessions')
            .update({ status })
            .eq('id', session_id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
