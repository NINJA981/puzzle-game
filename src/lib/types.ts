export type TeamStatus = 'UNUSED' | 'ACTIVE'

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
}

export interface Puzzle {
    id: string
    round_number: number
    round_name: string
    master_password: string
    is_live: boolean
    is_active: boolean
    created_at: string
}

export interface Clue {
    id: string
    puzzle_id: string
    character_position: number
    clue_text: string
    hint_text: string
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

export interface VerifyGuessResponse {
    success: boolean
    tries_remaining?: number
    locked_until?: string
    completed_round?: boolean
    next_character_index?: number
}

export interface HintResponse {
    success: boolean
    hint_text?: string
    tokens_remaining?: number
    error?: string
}

export interface GameBroadcast {
    type: 'GAME_START' | 'GAME_PAUSE' | 'ROUND_END'
    puzzle_id?: string
    round_name?: string
}
