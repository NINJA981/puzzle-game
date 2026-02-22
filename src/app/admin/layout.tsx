'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './admin.module.css'

const NAV_ITEMS = [
    { href: '/admin', label: 'Dashboard', icon: '◈' },
    { href: '/admin/codes', label: 'Team Codes', icon: '⊞' },
    { href: '/admin/puzzles', label: 'Puzzles', icon: '⧫' },
    { href: '/admin/live', label: 'Live Control', icon: '◉' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    if (pathname === '/admin/login') {
        return <>{children}</>
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/admin/login')
        router.refresh()
    }

    return (
        <div className={styles.adminWrapper}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h2 className="text-neon glow-text text-mono" style={{ fontSize: 'var(--font-base)', fontWeight: 700 }}>
                        DECODE
                    </h2>
                    <span className="text-muted text-mono" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                        Mission Control
                    </span>
                </div>

                <nav className={styles.sidebarNav}>
                    {NAV_ITEMS.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
                            onClick={(e) => {
                                e.preventDefault()
                                router.push(item.href)
                            }}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span>{item.label}</span>
                        </a>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
                        ← LOGOUT
                    </button>
                </div>
            </aside>

            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    )
}
