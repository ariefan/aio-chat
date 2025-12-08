"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/src/index'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@workspace/ui/src/components/button'
import { Badge } from '@workspace/ui/src/components/badge'
import { ArrowLeft, Save, RefreshCw, User, CreditCard } from 'lucide-react'

interface Debt {
  id: string
  periodMonth: number
  periodYear: number
  amount: number
  dueDate: string
  paidAmount: number | null
  status: string
  lateFee: number | null
}

export default function EditMemberPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [debts, setDebts] = useState<Debt[]>([])
  const [totalDebt, setTotalDebt] = useState(0)

  const [formData, setFormData] = useState({
    id: '',
    bpjsId: '',
    name: '',
    nik: '',
    phone: '',
    email: '',
    address: '',
    memberClass: '3',
    status: 'active'
  })

  const fetchMember = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bpjs/members/${memberId}`)
      if (res.ok) {
        const data = await res.json()
        setFormData({
          id: data.id,
          bpjsId: data.bpjsId,
          name: data.name,
          nik: data.nik,
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          memberClass: data.memberClass || '3',
          status: data.status || 'active'
        })
        setDebts(data.debts || [])
        setTotalDebt(data.totalDebt || 0)
      } else {
        setError('Gagal memuat data peserta')
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (memberId) {
      fetchMember()
    }
  }, [memberId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch(`/api/bpjs/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          memberClass: formData.memberClass,
          status: formData.status
        })
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/dashboard/members/${memberId}`)
        }, 1000)
      } else {
        const data = await res.json()
        setError(data.error || 'Gagal menyimpan perubahan')
      }
    } catch (err) {
      setError('Terjadi kesalahan saat menyimpan')
    }
    setSaving(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  const formatDate = (dateStr: string) => {
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
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900">Edit Peserta BPJS</h1>
                <p className="text-sm text-gray-600">No. BPJS: {formData.bpjsId || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Edit Form */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informasi Peserta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Read-only fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">No. BPJS</label>
                        <input
                          type="text"
                          value={formData.bpjsId}
                          disabled
                          className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">NIK</label>
                        <input
                          type="text"
                          value={formData.nik}
                          disabled
                          className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500"
                        />
                      </div>
                    </div>

                    {/* Editable fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="08xxxxxxxxxx"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="email@example.com"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                        <select
                          name="memberClass"
                          value={formData.memberClass}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="1">Kelas 1</option>
                          <option value="2">Kelas 2</option>
                          <option value="3">Kelas 3</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="active">Aktif</option>
                          <option value="inactive">Tidak Aktif</option>
                          <option value="suspended">Ditangguhkan</option>
                        </select>
                      </div>
                    </div>

                    {/* Error/Success messages */}
                    {error && (
                      <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
                        Berhasil disimpan! Mengalihkan...
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={saving}
                      >
                        Batal
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Simpan Perubahan
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Debt Summary Sidebar */}
              <div className="space-y-6">
                {/* Total Debt Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Ringkasan Tunggakan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-red-50 rounded-lg text-center">
                      <p className="text-sm text-red-600 mb-1">Total Tunggakan</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebt)}</p>
                    </div>
                    <div className="mt-4 text-center text-sm text-gray-500">
                      {debts.filter(d => d.status === 'active' || d.status === 'overdue').length} tagihan belum lunas
                    </div>
                  </CardContent>
                </Card>

                {/* Debt List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Daftar Tunggakan ({debts.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {debts.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        Tidak ada tunggakan
                      </div>
                    ) : (
                      <div className="divide-y max-h-[400px] overflow-y-auto">
                        {debts.map(debt => (
                          <div key={debt.id} className="p-3 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm">
                                  {getMonthName(debt.periodMonth)} {debt.periodYear}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Jatuh tempo: {formatDate(debt.dueDate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm">{formatCurrency(debt.amount)}</p>
                                {getStatusBadge(debt.status)}
                              </div>
                            </div>
                            {debt.lateFee && debt.lateFee > 0 && (
                              <p className="text-xs text-red-500 mt-1">
                                Denda: {formatCurrency(debt.lateFee)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
