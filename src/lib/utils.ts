export function generateJoinCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
}

export function generateBulkCodes(count: number): string[] {
    const codes = new Set<string>()
    while (codes.size < count) {
        codes.add(generateJoinCode())
    }
    return Array.from(codes)
}

export function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export function calculateScore(timeSeconds: number, hintsUsed: number, powerupsUsed: number = 0): number {
    if (timeSeconds <= 0) return 0

    let hintMultiplier = 1.0
    if (hintsUsed === 0) hintMultiplier = 1.5
    else if (hintsUsed <= 2) hintMultiplier = 1.2
    else if (hintsUsed <= 4) hintMultiplier = 1.0
    else hintMultiplier = 0.8

    // Powerup penalty: each powerup used reduces score by 10%
    const powerupMultiplier = Math.max(0.5, 1.0 - (powerupsUsed * 0.1))

    const score = (1 / timeSeconds) * 10000 * hintMultiplier * powerupMultiplier
    return Math.round(score * 100) / 100
}

export function cn(...classes: (string | undefined | false)[]): string {
    return classes.filter(Boolean).join(' ')
}
