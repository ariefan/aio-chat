"use client"

import { useState, useEffect } from 'react'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/src/index'
import { ProtectedRoute } from '@/components/protected-route'
import { useAuthSync } from '@/hooks/use-auth-sync'
import { Button } from '@workspace/ui/src/components/button'
import { Badge } from '@workspace/ui/src/components/badge'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Users,
  MessageCircle,
  CreditCard,
  LogOut,
  RefreshCw,
  Search,
  Edit,
  Eye
} from 'lucide-react'

interface BpjsMember {
  id: string
  bpjsId: string
  name: string
  phone: string | null
  memberClass: string
  status: string
  totalDebt: number
  userId: string | null
}

interface Conversation {
  id: string
  userId: string
  userName: string | null
  userPlatformType: string | null
  userPlatformId: string | null
  status: string
  lastMessageAt: string | null
}

interface DashboardStats {
  totalMembers: number
  totalConversations: number
  totalDebts: number
  pendingDebts: number
}

export default function DashboardPage() {
  const { session } = useAuthSync()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalConversations: 0,
    totalDebts: 0,
    pendingDebts: 0
  })
  const [members, setMembers] = useState<BpjsMember[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'members' | 'conversations'>('members')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch BPJS members
      const membersRes = await fetch('/api/bpjs/members')
      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setMembers(membersData.members || [])
        setStats(prev => ({ ...prev, totalMembers: membersData.members?.length || 0 }))
      }

      // Fetch conversations
      const convsRes = await fetch('/api/conversations')
      if (convsRes.ok) {
        const convsData = await convsRes.json()
        setConversations(convsData.conversations || [])
        setStats(prev => ({ ...prev, totalConversations: convsData.conversations?.length || 0 }))
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
          pendingDebts: pendingDebts.length
        }))
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.bpjsId.includes(searchTerm)
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Jenny BPJS</h1>
                <p className="text-sm text-gray-600">Selamat datang, {session?.user?.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Keluar
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalMembers}</p>
                    <p className="text-sm text-gray-600">Peserta BPJS</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalConversations}</p>
                    <p className="text-sm text-gray-600">Percakapan</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalDebts}</p>
                    <p className="text-sm text-gray-600">Total Tunggakan</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.pendingDebts}</p>
                    <p className="text-sm text-gray-600">Belum Bayar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={activeTab === 'members' ? 'default' : 'outline'}
              onClick={() => setActiveTab('members')}
            >
              <Users className="h-4 w-4 mr-2" />
              Peserta BPJS
            </Button>
            <Button
              variant={activeTab === 'conversations' ? 'default' : 'outline'}
              onClick={() => setActiveTab('conversations')}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Percakapan
            </Button>
          </div>

          {/* Search */}
          {activeTab === 'members' && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau nomor BPJS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Memuat data...
                </div>
              ) : activeTab === 'members' ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-600">No. BPJS</th>
                        <th className="text-left p-4 font-medium text-gray-600">Nama</th>
                        <th className="text-left p-4 font-medium text-gray-600">Telepon</th>
                        <th className="text-left p-4 font-medium text-gray-600">Kelas</th>
                        <th className="text-left p-4 font-medium text-gray-600">Status</th>
                        <th className="text-left p-4 font-medium text-gray-600">Tunggakan</th>
                        <th className="text-left p-4 font-medium text-gray-600">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-500">
                            {searchTerm ? 'Tidak ditemukan' : 'Belum ada data peserta'}
                          </td>
                        </tr>
                      ) : filteredMembers.map(member => (
                        <tr key={member.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-mono text-sm">{member.bpjsId}</td>
                          <td className="p-4">{member.name}</td>
                          <td className="p-4">{member.phone || '-'}</td>
                          <td className="p-4">Kelas {member.memberClass}</td>
                          <td className="p-4">
                            <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                              {member.status === 'active' ? 'Aktif' : member.status}
                            </Badge>
                          </td>
                          <td className="p-4 font-semibold text-red-600">
                            {member.totalDebt > 0 ? formatCurrency(member.totalDebt) : '-'}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/members/${member.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => alert('Fitur edit belum tersedia di POC')}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-600">ID</th>
                        <th className="text-left p-4 font-medium text-gray-600">Pengguna</th>
                        <th className="text-left p-4 font-medium text-gray-600">Platform</th>
                        <th className="text-left p-4 font-medium text-gray-600">Status</th>
                        <th className="text-left p-4 font-medium text-gray-600">Pesan Terakhir</th>
                        <th className="text-left p-4 font-medium text-gray-600">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-500">
                            Belum ada percakapan
                          </td>
                        </tr>
                      ) : conversations.map(conv => (
                        <tr key={conv.id} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-mono text-xs">{conv.id.slice(0, 8)}...</td>
                          <td className="p-4">{conv.userName || 'Pengguna'}</td>
                          <td className="p-4">
                            <Badge variant="outline">
                              {conv.userPlatformType === 'telegram' ? 'Telegram' : (conv.userPlatformType || '-')}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={conv.status === 'active' ? 'default' : 'secondary'}>
                              {conv.status === 'active' ? 'Aktif' : 'Ditutup'}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {formatDate(conv.lastMessageAt)}
                          </td>
                          <td className="p-4">
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/conversations/${conv.id}`)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Lihat
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
