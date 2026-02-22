import { generateJoinCode, generateBulkCodes, formatTime, formatDuration, calculateScore, cn } from '@/lib/utils'

describe('Utils', () => {
    describe('generateJoinCode', () => {
        it('should generate a 6-character code', () => {
            const code = generateJoinCode()
            expect(code).toHaveLength(6)
        })

        it('should only contain valid characters (no ambiguous chars)', () => {
            const validChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
            for (let i = 0; i < 50; i++) {
                const code = generateJoinCode()
                for (const char of code) {
                    expect(validChars).toContain(char)
                }
            }
        })

        it('should not contain ambiguous characters (I, O, 0, 1)', () => {
            for (let i = 0; i < 100; i++) {
                const code = generateJoinCode()
                expect(code).not.toMatch(/[IO01]/)
            }
        })
    })

    describe('generateBulkCodes', () => {
        it('should generate the requested number of unique codes', () => {
            const codes = generateBulkCodes(10)
            expect(codes).toHaveLength(10)
            expect(new Set(codes).size).toBe(10)
        })

        it('should handle generating a single code', () => {
            const codes = generateBulkCodes(1)
            expect(codes).toHaveLength(1)
        })

        it('should generate 100 unique codes without duplicates', () => {
            const codes = generateBulkCodes(100)
            expect(codes).toHaveLength(100)
            expect(new Set(codes).size).toBe(100)
        })
    })

    describe('formatTime', () => {
        it('should format 0 seconds as 0:00', () => {
            expect(formatTime(0)).toBe('0:00')
        })

        it('should format 65 seconds as 1:05', () => {
            expect(formatTime(65)).toBe('1:05')
        })

        it('should format 600 seconds as 10:00', () => {
            expect(formatTime(600)).toBe('10:00')
        })

        it('should format 59 seconds as 0:59', () => {
            expect(formatTime(59)).toBe('0:59')
        })
    })

    describe('formatDuration', () => {
        it('should return seconds for < 60', () => {
            expect(formatDuration(45)).toBe('45s')
        })

        it('should return minutes only when even', () => {
            expect(formatDuration(120)).toBe('2m')
        })

        it('should return minutes and seconds', () => {
            expect(formatDuration(125)).toBe('2m 5s')
        })
    })

    describe('calculateScore', () => {
        it('should return 0 for time <= 0', () => {
            expect(calculateScore(0, 0)).toBe(0)
            expect(calculateScore(-5, 0)).toBe(0)
        })

        it('should give higher score for faster time', () => {
            const fast = calculateScore(60, 0)
            const slow = calculateScore(300, 0)
            expect(fast).toBeGreaterThan(slow)
        })

        it('should apply 1.5x multiplier for 0 hints', () => {
            const score = calculateScore(100, 0)
            const expected = Math.round(((1 / 100) * 10000 * 1.5) * 100) / 100
            expect(score).toBe(expected)
        })

        it('should apply 1.2x multiplier for 1-2 hints', () => {
            const score = calculateScore(100, 1)
            const expected = Math.round(((1 / 100) * 10000 * 1.2) * 100) / 100
            expect(score).toBe(expected)
        })

        it('should apply 1.0x multiplier for 3-4 hints', () => {
            const score = calculateScore(100, 3)
            const expected = Math.round(((1 / 100) * 10000 * 1.0) * 100) / 100
            expect(score).toBe(expected)
        })

        it('should apply 0.8x multiplier for 5+ hints', () => {
            const score = calculateScore(100, 5)
            const expected = Math.round(((1 / 100) * 10000 * 0.8) * 100) / 100
            expect(score).toBe(expected)
        })

        it('should penalize more hints used', () => {
            const noHints = calculateScore(100, 0)
            const manyHints = calculateScore(100, 5)
            expect(noHints).toBeGreaterThan(manyHints)
        })
    })

    describe('cn', () => {
        it('should join class names', () => {
            expect(cn('a', 'b', 'c')).toBe('a b c')
        })

        it('should filter out falsy values', () => {
            expect(cn('a', false, undefined, 'b')).toBe('a b')
        })

        it('should return empty string for no args', () => {
            expect(cn()).toBe('')
        })
    })
})
