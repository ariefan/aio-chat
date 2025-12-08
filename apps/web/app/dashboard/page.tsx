"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@workspace/ui/src/index'
import { DashboardLayout } from '@/components/dashboard/layout'
import { useRouter } from 'next/navigation'
import {
  Users,
  MessageCircle,
  CreditCard,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { useAuthSync } from '@/hooks/use-auth-sync'

interface DashboardStats {
  totalMembers: number
  totalConversations: number
  totalDebts: number
  pendingDebts: number
  activeConversations: number
  verifiedMembers: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { session } = useAuthSync()
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalConversations: 0,
    totalDebts: 0,
    pendingDebts: 0,
    activeConversations: 0,
    verifiedMembers: 0,
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Fetch BPJS members
      const membersRes = await fetch('/api/bpjs/members')
      if (membersRes.ok) {
        const membersData = await membersRes.json()
        const members = membersData.members || []
        setStats(prev => ({
          ...prev,
          totalMembers: members.length,
          verifiedMembers: members.filter((m: any) => m.userId).length,
        }))
      }

      // Fetch conversations
      const convsRes = await fetch('/api/conversations')
      if (convsRes.ok) {
        const convsData = await convsRes.json()
        const conversations = convsData.conversations || []
        setStats(prev => ({
          ...prev,
          totalConversations: conversations.length,
          activeConversations: conversations.filter((c: any) => c.status === 'active').length,
        }))
      }

      // Fetch debts stats
      const debtsRes = await fetch('/api/bpjs/debts')
      if (debtsRes.ok) {
        const debtsData = await debtsRes.json()
        const debts = debtsData.debts || []
        const pendingDebts = debts.filter((d: any) => d.status === 'active' || d.status === 'overdue')
        setStats(prev => ({
          ...prev,
          totalDebts: debts.length,
          pendingDebts: pendingDebts.length,
        }))
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Total Peserta',
      value: stats.totalMembers,
      icon: Users,
      color: 'blue',
      href: '/dashboard/members',
      subtitle: `${stats.verifiedMembers} terverifikasi`,
    },
    {
      title: 'Percakapan',
      value: stats.totalConversations,
      icon: MessageCircle,
      color: 'green',
      href: '/dashboard/conversations',
      subtitle: `${stats.activeConversations} aktif`,
    },
    {
      title: 'Total Tunggakan',
      value: stats.totalDebts,
      icon: CreditCard,
      color: 'yellow',
      href: '/dashboard/members',
      subtitle: 'Lihat detail',
    },
    {
      title: 'Belum Bayar',
      value: stats.pendingDebts,
      icon: AlertCircle,
      color: 'red',
      href: '/dashboard/members',
      subtitle: 'Perlu tindakan',
    },
  ]

  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
  }

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={`Selamat datang, ${session?.user?.name || 'User'}`}
      onRefresh={fetchStats}
      loading={loading}
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const colors = colorClasses[stat.color] ?? { bg: 'bg-blue-100', text: 'text-blue-600' }
          return (
            <Card
              key={stat.title}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(stat.href)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${colors.bg} rounded-lg`}>
                      <stat.icon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {loading ? '-' : stat.value.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">{stat.title}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                <p className="mt-2 text-xs text-gray-500">{stat.subtitle}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Aktivitas Terbaru
            </h3>
            <div className="space-y-3">
              <div
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => router.push('/dashboard/conversations')}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">Lihat Percakapan</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.activeConversations} percakapan aktif
                </p>
              </div>
              <div
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => router.push('/dashboard/members')}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">Kelola Peserta</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.totalMembers} peserta terdaftar
                </p>
              </div>
              <div
                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => router.push('/dashboard/simulation')}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">Simulasi Penagihan</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Latih strategi penagihan dengan AI
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Ringkasan Tunggakan
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Tunggakan</span>
                <span className="font-semibold">{stats.totalDebts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Belum Dibayar</span>
                <span className="font-semibold text-red-600">{stats.pendingDebts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Peserta dengan Tunggakan</span>
                <span className="font-semibold">
                  {loading ? '-' : `${Math.round((stats.pendingDebts / Math.max(stats.totalMembers, 1)) * 100)}%`}
                </span>
              </div>
              <div className="pt-4 border-t">
                <button
                  onClick={() => router.push('/dashboard/members')}
                  className="w-full text-center text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  Lihat Detail Tunggakan
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
