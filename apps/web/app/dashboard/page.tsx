"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@workspace/ui/src/index'
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
  Eye,
  Upload,
  X,
  Download,
  Bot,
  LayoutDashboard,
  FileText,
  Settings,
  ChevronRight
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

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

  // CSV parsing
  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headerLine = lines[0]!
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!
      const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''))
      const row: any = {}

      headers.forEach((header, idx) => {
        // Map common header names
        if (header === 'bpjs_id' || header === 'bpjsid' || header === 'no_bpjs' || header === 'nobpjs') {
          row.bpjsId = values[idx]
        } else if (header === 'nik' || header === 'no_ktp') {
          row.nik = values[idx]
        } else if (header === 'nama' || header === 'name') {
          row.name = values[idx]
        } else if (header === 'telepon' || header === 'phone' || header === 'hp' || header === 'no_hp') {
          row.phone = values[idx]
        } else if (header === 'email') {
          row.email = values[idx]
        } else if (header === 'alamat' || header === 'address') {
          row.address = values[idx]
        } else if (header === 'kelas' || header === 'class' || header === 'member_class' || header === 'memberclass') {
          row.memberClass = values[idx]
        } else if (header === 'status') {
          row.status = values[idx]
        }
      })

      if (row.bpjsId && row.nik && row.name) {
        data.push(row)
      }
    }

    return data
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const data = parseCSV(text)
      setImportData(data)
      setImportResult(null)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (importData.length === 0) return

    setImporting(true)
    try {
      const res = await fetch('/api/bpjs/members/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: importData })
      })

      const result = await res.json()
      setImportResult({
        success: result.success || 0,
        failed: result.failed || 0,
        errors: result.errors || []
      })

      if (result.success > 0) {
        fetchData() // Refresh member list
      }
    } catch (error) {
      setImportResult({ success: 0, failed: importData.length, errors: ['Gagal mengimpor data'] })
    }
    setImporting(false)
  }

  const downloadTemplate = () => {
    const template = 'bpjsId,nik,name,phone,email,address,memberClass,status\n0001234567890,3201012345678901,John Doe,08123456789,john@example.com,Jl. Contoh No. 1,3,active'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_import_peserta.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const closeImportModal = () => {
    setShowImportModal(false)
    setImportData([])
    setImportResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', active: true },
    { icon: Users, label: 'Peserta BPJS', href: '/dashboard', tab: 'members' },
    { icon: MessageCircle, label: 'Percakapan', href: '/dashboard', tab: 'conversations' },
    { icon: Bot, label: 'Simulasi PANDAWA', href: '/dashboard/simulation' },
    { icon: FileText, label: 'Laporan', href: '/dashboard/reports', disabled: true },
    { icon: Settings, label: 'Pengaturan', href: '/dashboard/settings', disabled: true },
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
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
                  if (item.tab) {
                    setActiveTab(item.tab as 'members' | 'conversations')
                  } else {
                    router.push(item.href)
                  }
                }}
                disabled={item.disabled}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  item.active || (item.tab && activeTab === item.tab)
                    ? 'bg-green-50 text-green-700 font-medium'
                    : item.disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.href === '/dashboard/simulation' && (
                  <Badge variant="default" className="ml-auto text-[10px] px-1.5 py-0">New</Badge>
                )}
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="bg-white border-b">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-sm text-gray-600">Selamat datang, {session?.user?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="default" size="sm" className="lg:hidden" onClick={() => router.push('/dashboard/simulation')}>
                    <Bot className="h-4 w-4 mr-2" />
                    Simulasi
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" className="lg:hidden" onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
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

          {/* Search and Import */}
          {activeTab === 'members' && (
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau nomor BPJS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
              <Button variant="outline" onClick={() => setShowImportModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
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
                            {searchTerm ? 'Tidak ditemukan' : 'Belum ada data peserta. Klik "Import CSV" untuk mengimpor data.'}
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
                              <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/members/${member.id}/edit`)}>
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

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-bold">Import Peserta BPJS dari CSV</h2>
                <Button variant="ghost" size="sm" onClick={closeImportModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                {/* Template Download */}
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2">
                    Format CSV: bpjsId, nik, name, phone, email, address, memberClass, status
                  </p>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">Pilih File CSV</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                {/* Preview */}
                {importData.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Preview ({importData.length} data)</p>
                    <div className="border rounded-lg overflow-x-auto max-h-48">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-2 text-left">No. BPJS</th>
                            <th className="p-2 text-left">NIK</th>
                            <th className="p-2 text-left">Nama</th>
                            <th className="p-2 text-left">Telepon</th>
                            <th className="p-2 text-left">Kelas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importData.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="p-2 font-mono text-xs">{row.bpjsId}</td>
                              <td className="p-2 font-mono text-xs">{row.nik}</td>
                              <td className="p-2">{row.name}</td>
                              <td className="p-2">{row.phone || '-'}</td>
                              <td className="p-2">{row.memberClass || '3'}</td>
                            </tr>
                          ))}
                          {importData.length > 5 && (
                            <tr className="border-t">
                              <td colSpan={5} className="p-2 text-center text-gray-500">
                                ... dan {importData.length - 5} data lainnya
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Result */}
                {importResult && (
                  <div className={`p-3 rounded-lg ${importResult.failed > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
                    <p className="font-medium">
                      Hasil Import: {importResult.success} berhasil, {importResult.failed} gagal
                    </p>
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                        {importResult.errors.slice(0, 3).map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                        {importResult.errors.length > 3 && (
                          <li>... dan {importResult.errors.length - 3} error lainnya</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-4 border-t">
                <Button variant="outline" onClick={closeImportModal}>
                  {importResult ? 'Tutup' : 'Batal'}
                </Button>
                {!importResult && (
                  <Button
                    onClick={handleImport}
                    disabled={importData.length === 0 || importing}
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Mengimpor...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import {importData.length} Data
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
