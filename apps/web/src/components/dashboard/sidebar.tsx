"use client"

import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@workspace/ui/src/components/button'
import { signOut, useSession } from 'next-auth/react'
import {
  Users,
  MessageCircle,
  LogOut,
  Bot,
  LayoutDashboard,
  Settings,
  Bell,
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Peserta BPJS', href: '/dashboard/members' },
  { icon: MessageCircle, label: 'Percakapan', href: '/dashboard/conversations' },
  { icon: Bell, label: 'Proaktif', href: '/dashboard/proactive' },
  { icon: Bot, label: 'Simulasi', href: '/dashboard/simulation' },
  { icon: Settings, label: 'Pengaturan', href: '/dashboard/settings' },
]

export function DashboardSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="w-64 bg-white border-r flex flex-col shrink-0 hidden lg:flex">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-green-600">RICH BPJS</h1>
        <p className="text-xs text-gray-500">Research Insight Circle Hub</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (item.disabled) return
              router.push(item.href)
            }}
            disabled={item.disabled}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive(item.href)
                ? 'bg-green-50 text-green-700 font-medium'
                : item.disabled
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-medium text-sm">
            {session?.user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
