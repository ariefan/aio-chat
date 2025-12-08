"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/src/index'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@workspace/ui/src/components/button'
import { Badge } from '@workspace/ui/src/components/badge'
import { ArrowLeft, User, CreditCard, RefreshCw, Calendar, Phone, Mail, MapPin, Hash } from 'lucide-react'

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
        return <Badge variant="destructive">Jatuh Tempo</Badge>
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
