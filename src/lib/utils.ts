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

export function cn(...classes: (string | undefined | false)[]): string {
    return classes.filter(Boolean).join(' ')
}
