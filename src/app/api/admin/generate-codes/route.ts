import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateBulkCodes } from '@/lib/utils'

export async function POST(request: NextRequest) {
    try {
        const { count } = await request.json()
        const num = Math.min(Math.max(parseInt(count) || 0, 1), 500)

        const supabase = createServiceClient()
        const codes = generateBulkCodes(num)

        const rows = codes.map((code) => ({
            join_code: code,
            status: 'UNUSED' as const,
            team_name: '',
            hint_tokens: 3,
            current_character_index: 0,
        }))

        const { data, error } = await supabase.from('teams').insert(rows).select()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ codes: data, count: data?.length || 0 })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
