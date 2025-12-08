"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/src/index'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@workspace/ui/src/components/button'
import { Badge } from '@workspace/ui/src/components/badge'
import { ArrowLeft, User, CreditCard, RefreshCw, Calendar, Phone, Mail, MapPin, Hash, Activity, MessageSquare, Target, Hospital, Bot } from 'lucide-react'

interface Debt {
  id: string
  periodMonth: number
  periodYear: number
  amount: number
  dueDate: string
  paidAmount: number | null
  paidAt: string | null
  status: string
  lateFee: number | null
  description: string | null
}

interface MemberDetail {
  id: string
  bpjsId: string
  name: string
  nik: string
  phone: string | null
  email: string | null
  address: string | null
  memberClass: string
  status: string
  registeredAt: string | null
  createdAt: string
  debts: Debt[]
  totalDebt: number
  // Simulation fields
  occupation: string | null
  dependents: number | null
  totalArrears: number | null
  arrearsMonths: number | null
  lastPaymentDate: string | null
  lastPaymentMethod: string | null
  lastClaimDate: string | null
  lastClaimType: string | null
  lastClaimDiagnosis: string | null
  lastClaimHospital: string | null
  lastClaimAmount: number | null
  lastContactAgent: string | null
  lastContactDate: string | null
  lastContactChannel: string | null
  lastContactOutcome: string | null
  arrearsReason: string | null
  credibilityScore: number | null
  lastPromiseDate: string | null
  lastPromiseStatus: string | null
  lastPromiseDaysOverdue: number | null
  strategyApproach: string | null
  strategyUrgency: string | null
  strategyTone: string | null
}

export default function MemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string

  const [member, setMember] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bpjs/members/${memberId}`)
      if (res.ok) {
        const data = await res.json()
        setMember(data)
      }
    } catch (error) {
      console.error('Failed to fetch member:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (memberId) {
      fetchData()
    }
  }, [memberId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return months[month - 1] || '-'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Aktif</Badge>
      case 'paid':
        return <Badge className="bg-green-500">Lunas</Badge>
      case 'partial':
        return <Badge className="bg-yellow-500">Sebagian</Badge>
      case 'overdue':
        return <Badge variant="destructive" className="text-white">Jatuh Tempo</Badge>
      case 'written_off':
        return <Badge variant="secondary">Dihapus</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getMemberStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Aktif</Badge>
      case 'inactive':
        return <Badge variant="secondary">Tidak Aktif</Badge>
      case 'suspended':
        return <Badge variant="destructive">Ditangguhkan</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Calculate debt summary
  const activeDebts = member?.debts.filter(d => d.status === 'active' || d.status === 'overdue') || []
  const paidDebts = member?.debts.filter(d => d.status === 'paid') || []
  const overdueDebts = member?.debts.filter(d => d.status === 'overdue') || []

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900">Detail Peserta BPJS</h1>
                <p className="text-sm text-gray-600">No. BPJS: {member?.bpjsId || '-'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : member ? (
            <div className="space-y-6">
              {/* Top Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Member Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Informasi Peserta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-500">Nama</label>
                      <p className="font-medium">{member.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 flex items-center gap-1">
                        <Hash className="h-3 w-3" /> NIK
                      </label>
                      <p className="font-mono">{member.nik}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> No. BPJS
                      </label>
                      <p className="font-mono">{member.bpjsId}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Kelas</label>
                      <p><Badge variant="outline">Kelas {member.memberClass}</Badge></p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Status</label>
                      <p>{getMemberStatusBadge(member.status)}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      Kontak
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Telepon
                      </label>
                      <p>{member.phone || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email
                      </label>
                      <p>{member.email || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Alamat
                      </label>
                      <p className="text-sm">{member.address || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Terdaftar
                      </label>
                      <p className="text-sm">{formatDate(member.registeredAt || member.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Debt Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Ringkasan Tunggakan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-lg">
                      <label className="text-sm text-red-600">Total Tunggakan</label>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(member.totalDebt)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-lg font-bold">{activeDebts.length}</p>
                        <p className="text-xs text-gray-500">Aktif</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-lg font-bold text-red-600">{overdueDebts.length}</p>
                        <p className="text-xs text-gray-500">Jatuh Tempo</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-lg font-bold text-green-600">{paidDebts.length}</p>
                        <p className="text-xs text-gray-500">Lunas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Simulation Data Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Claim History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hospital className="h-5 w-5" />
                      Riwayat Klaim Terakhir
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {member.lastClaimDate ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Tanggal Klaim</label>
                            <p className="font-medium">{formatDate(member.lastClaimDate)}</p>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Tipe</label>
                            <p>{member.lastClaimType || '-'}</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Rumah Sakit</label>
                          <p>{member.lastClaimHospital || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Diagnosis</label>
                          <p className="text-sm">{member.lastClaimDiagnosis || '-'}</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <label className="text-sm text-blue-600">Jumlah Klaim</label>
                          <p className="text-xl font-bold text-blue-600">
                            {member.lastClaimAmount ? formatCurrency(member.lastClaimAmount) : '-'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Belum ada data klaim</p>
                    )}
                  </CardContent>
                </Card>

                {/* Interaction History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Riwayat Interaksi Terakhir
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {member.lastContactDate ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Tanggal Kontak</label>
                            <p className="font-medium">{formatDate(member.lastContactDate)}</p>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Channel</label>
                            <Badge variant="outline">{member.lastContactChannel || '-'}</Badge>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Agent</label>
                          <p>{member.lastContactAgent || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Hasil</label>
                          <p>{member.lastContactOutcome || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">Alasan Tunggakan</label>
                          <p className="text-sm">{member.arrearsReason || '-'}</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Belum ada riwayat interaksi</p>
                    )}
                  </CardContent>
                </Card>

                {/* Credibility & Commitment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Kredibilitas & Komitmen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Skor Kredibilitas</span>
                        <span className="font-medium">{((member.credibilityScore || 0.5) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            (member.credibilityScore || 0.5) >= 0.7 ? 'bg-green-500' :
                            (member.credibilityScore || 0.5) >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(member.credibilityScore || 0.5) * 100}%` }}
                        />
                      </div>
                    </div>
                    {member.lastPromiseDate ? (
                      <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-500">Janji Bayar</label>
                            <p className="font-medium">{formatDate(member.lastPromiseDate)}</p>
                          </div>
                          <div>
                            <label className="text-sm text-gray-500">Status</label>
                            <Badge variant={member.lastPromiseStatus === 'fulfilled' ? 'default' : 'destructive'}>
                              {member.lastPromiseStatus || '-'}
                            </Badge>
                          </div>
                        </div>
                        {(member.lastPromiseDaysOverdue ?? 0) > 0 && (
                          <p className="text-sm text-red-600">
                            Terlambat {member.lastPromiseDaysOverdue} hari
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Belum ada komitmen pembayaran</p>
                    )}
                  </CardContent>
                </Card>

                {/* Strategy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Strategi Penagihan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {member.strategyApproach ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="bg-blue-50">
                            {member.strategyApproach}
                          </Badge>
                          {member.strategyUrgency && (
                            <Badge variant={
                              member.strategyUrgency === 'high' ? 'destructive' :
                              member.strategyUrgency === 'medium' ? 'default' : 'secondary'
                            }>
                              Urgensi: {member.strategyUrgency}
                            </Badge>
                          )}
                          {member.strategyTone && (
                            <Badge variant="outline">
                              Tone: {member.strategyTone}
                            </Badge>
                          )}
                        </div>
                        <Button
                          className="w-full mt-2"
                          onClick={() => router.push(`/dashboard/simulation?memberId=${member.id}`)}
                        >
                          <Bot className="h-4 w-4 mr-2" />
                          Mulai Simulasi PANDAWA
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-500 text-sm">Strategi belum ditentukan</p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => router.push(`/dashboard/simulation?memberId=${member.id}`)}
                        >
                          <Bot className="h-4 w-4 mr-2" />
                          Mulai Simulasi PANDAWA
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Debt List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Daftar Tunggakan ({member.debts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {member.debts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Tidak ada tunggakan
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left p-4 font-medium text-gray-600">Periode</th>
                            <th className="text-left p-4 font-medium text-gray-600">Jumlah</th>
                            <th className="text-left p-4 font-medium text-gray-600">Denda</th>
                            <th className="text-left p-4 font-medium text-gray-600">Dibayar</th>
                            <th className="text-left p-4 font-medium text-gray-600">Jatuh Tempo</th>
                            <th className="text-left p-4 font-medium text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {member.debts.map(debt => (
                            <tr key={debt.id} className="border-b hover:bg-gray-50">
                              <td className="p-4 font-medium">
                                {getMonthName(debt.periodMonth)} {debt.periodYear}
                              </td>
                              <td className="p-4">{formatCurrency(debt.amount)}</td>
                              <td className="p-4 text-red-600">
                                {debt.lateFee ? formatCurrency(debt.lateFee) : '-'}
                              </td>
                              <td className="p-4 text-green-600">
                                {debt.paidAmount ? formatCurrency(debt.paidAmount) : '-'}
                              </td>
                              <td className="p-4 text-sm">{formatDate(debt.dueDate)}</td>
                              <td className="p-4">{getStatusBadge(debt.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Peserta tidak ditemukan
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
