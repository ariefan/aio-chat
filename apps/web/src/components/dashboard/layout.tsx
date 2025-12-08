"use client"

import { ReactNode } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import { DashboardSidebar } from './sidebar'
import { Button } from '@workspace/ui/src/components/button'
import { RefreshCw, LogOut, Bot } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useAuthSync } from '@/hooks/use-auth-sync'

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  onRefresh?: () => void
  loading?: boolean
  actions?: ReactNode
}

export function DashboardLayout({
  children,
  title,
  subtitle,
  onRefresh,
  loading,
  actions,
}: DashboardLayoutProps) {
  const router = useRouter()
  const { session } = useAuthSync()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        <DashboardSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="bg-white border-b">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="default" size="sm" className="lg:hidden" onClick={() => router.push('/dashboard/simulation')}>
                    <Bot className="h-4 w-4 mr-2" />
                    Simulasi
                  </Button>
                  {onRefresh && (
                    <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  )}
                  {actions}
                  <Button variant="outline" size="sm" className="lg:hidden" onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
