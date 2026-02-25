export type TeamStatus = 'UNUSED' | 'ACTIVE' | 'ELIMINATED'

export interface Team {
    id: string
    team_name: string
    join_code: string
    status: TeamStatus
    hint_tokens: number
    current_puzzle_id: string | null
    current_character_index: number
    completed_at: string | null
    created_at: string
    is_eliminated: boolean
    eliminated_at: string | null
    round_start_time: string | null
    hints_used_total: number
    final_answer_submitted: boolean
    selected_powerups: string[]
    current_round: number
    is_qualified: boolean
}

export interface Puzzle {
    id: string
    round_number: number
    round_name: string
    master_password: string
    is_live: boolean
    is_active: boolean
    time_limit_seconds: number
    max_powerups: number
    max_hints: number
    session_id: string | null
    created_at: string
}

export interface Clue {
    id: string
    puzzle_id: string
    character_position: number
    clue_text: string
    hint_text: string
    hint_1: string
    hint_2: string
    hint_3: string
    image_url: string
    expected_answer: string
    max_tries: number
    lockout_duration_seconds: number
    created_at: string
}

export interface TeamProgress {
    id: string
    team_id: string
    clue_id: string
    tries_used: number
    locked_until: string | null
    completed: boolean
    created_at: string
}

export interface GameSession {
    id: string
    name: string
    status: 'SETUP' | 'LIVE' | 'ENDED'
    current_round: number
    total_rounds: number
    created_at: string
}

export interface Powerup {
    id: string
    name: string
    slug: string
    description: string
    icon: string
    effect: Record<string, unknown>
    is_active: boolean
    created_at: string
}

export interface TeamPowerup {
    id: string
    team_id: string
    powerup_id: string
    puzzle_id: string
    is_used: boolean
    used_at: string | null
    created_at: string
}

export interface LeaderboardEntry {
    id: string
    team_id: string
    puzzle_id: string
    time_seconds: number
    hints_used: number
    score: number
    rank: number
    completed: boolean
    created_at: string
    team?: Team
}

export interface VerifyGuessResponse {
    success: boolean
    tries_remaining?: number
    locked_until?: string
    completed_round?: boolean
    next_character_index?: number
    is_eliminated?: boolean
}

export interface HintResponse {
    success: boolean
    hint_text?: string
    hint_level?: number
    tokens_remaining?: number
    error?: string
}

export interface GameBroadcast {
    type: 'GAME_START' | 'GAME_PAUSE' | 'ROUND_END' | 'GAME_END' | 'EXTRA_LIFE' | 'ROUND_ADVANCE'
    puzzle_id?: string
    round_name?: string
}
