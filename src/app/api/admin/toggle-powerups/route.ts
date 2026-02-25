import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const { enabled } = await request.json()
        const supabase = createServiceClient()

        // Get the active puzzle
        const { data: puzzle } = await supabase
            .from('puzzles')
            .select('id')
            .eq('is_active', true)
            .single()

        if (!puzzle) {
            return NextResponse.json({ error: 'No active puzzle' }, { status: 404 })
        }

        // Set max_powerups to 0 (disabled) or 3 (enabled)
        const maxPowerups = enabled ? 3 : 0
        await supabase
            .from('puzzles')
            .update({ max_powerups: maxPowerups })
            .eq('id', puzzle.id)

        return NextResponse.json({ success: true, powerups_enabled: enabled, max_powerups: maxPowerups })
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
