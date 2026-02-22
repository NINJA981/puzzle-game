import type { Team, Clue, Puzzle, Powerup, LeaderboardEntry, GameSession, TeamPowerup, TeamProgress, TeamStatus } from '@/lib/types'

describe('Types', () => {
    describe('Team', () => {
        it('should define a valid Team object', () => {
            const team: Team = {
                id: 'uuid',
                team_name: 'Alpha',
                join_code: 'ABC123',
                status: 'ACTIVE' as TeamStatus,
                hint_tokens: 3,
                current_puzzle_id: null,
                current_character_index: 0,
                completed_at: null,
                created_at: '2026-01-01',
                is_eliminated: false,
                eliminated_at: null,
                round_start_time: null,
                hints_used_total: 0,
                final_answer_submitted: false,
                selected_powerups: [],
                current_round: 1,
                is_qualified: true,
            }
            expect(team.status).toBe('ACTIVE')
            expect(team.is_eliminated).toBe(false)
            expect(team.selected_powerups).toEqual([])
        })
    })

    describe('Clue', () => {
        it('should define a Clue with 3-tier hints', () => {
            const clue: Clue = {
                id: 'uuid',
                puzzle_id: 'puzzle-uuid',
                character_position: 0,
                clue_text: 'What animal says meow?',
                hint_text: 'Its a pet',
                hint_1: 'Its a pet',
                hint_2: 'Has whiskers',
                hint_3: 'Starts with C',
                image_url: '',
                expected_answer: 'C',
                max_tries: 3,
                lockout_duration_seconds: 30,
                created_at: '2026-01-01',
            }
            expect(clue.hint_1).toBe('Its a pet')
            expect(clue.hint_2).toBe('Has whiskers')
            expect(clue.hint_3).toBe('Starts with C')
        })
    })

    describe('Puzzle', () => {
        it('should define a Puzzle with time limit', () => {
            const puzzle: Puzzle = {
                id: 'uuid',
                round_number: 1,
                round_name: 'Round 1',
                master_password: 'CAT',
                is_live: false,
                is_active: false,
                time_limit_seconds: 300,
                session_id: null,
                created_at: '2026-01-01',
            }
            expect(puzzle.time_limit_seconds).toBe(300)
        })
    })

    describe('LeaderboardEntry', () => {
        it('should define a scored leaderboard entry', () => {
            const entry: LeaderboardEntry = {
                id: 'uuid',
                team_id: 'team-uuid',
                puzzle_id: 'puzzle-uuid',
                time_seconds: 120,
                hints_used: 2,
                score: 100,
                rank: 1,
                completed: true,
                created_at: '2026-01-01',
            }
            expect(entry.score).toBe(100)
            expect(entry.rank).toBe(1)
        })
    })

    describe('Powerup', () => {
        it('should define a powerup with effect', () => {
            const powerup: Powerup = {
                id: 'uuid',
                name: 'X-Ray',
                slug: 'xray',
                description: 'Reveals one answer',
                icon: '🔍',
                effect: { type: 'reveal_answer' },
                is_active: true,
                created_at: '2026-01-01',
            }
            expect(powerup.slug).toBe('xray')
            expect(powerup.effect).toEqual({ type: 'reveal_answer' })
        })
    })

    describe('GameSession', () => {
        it('should define a tournament session', () => {
            const session: GameSession = {
                id: 'uuid',
                name: 'Finals',
                status: 'SETUP',
                current_round: 0,
                total_rounds: 3,
                created_at: '2026-01-01',
            }
            expect(session.status).toBe('SETUP')
            expect(session.total_rounds).toBe(3)
        })
    })

    describe('TeamPowerup', () => {
        it('should define a team powerup selection', () => {
            const tp: TeamPowerup = {
                id: 'uuid',
                team_id: 'team-uuid',
                powerup_id: 'power-uuid',
                puzzle_id: 'puzzle-uuid',
                is_used: false,
                used_at: null,
                created_at: '2026-01-01',
            }
            expect(tp.is_used).toBe(false)
        })
    })

    describe('TeamProgress', () => {
        it('should define team progress per clue', () => {
            const progress: TeamProgress = {
                id: 'uuid',
                team_id: 'team-uuid',
                clue_id: 'clue-uuid',
                tries_used: 2,
                locked_until: null,
                completed: false,
                created_at: '2026-01-01',
            }
            expect(progress.tries_used).toBe(2)
            expect(progress.completed).toBe(false)
        })
    })
})
