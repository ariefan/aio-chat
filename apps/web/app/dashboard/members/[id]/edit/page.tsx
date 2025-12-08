"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/src/index'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@workspace/ui/src/components/button'
import { Badge } from '@workspace/ui/src/components/badge'
import { ArrowLeft, Save, RefreshCw, User, CreditCard, Trash2, Plus } from 'lucide-react'

interface Debt {
  id: string
  periodMonth: number
  periodYear: number
  amount: number
  dueDate: string
  paidAmount: number | null
  status: string
  lateFee: number | null
  description: string | null
}

interface EditableDebt extends Debt {
  isNew?: boolean
  isDeleted?: boolean
  isModified?: boolean
}

export default function EditMemberPage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [debts, setDebts] = useState<EditableDebt[]>([])
  const [originalDebts, setOriginalDebts] = useState<Debt[]>([])

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
        setOriginalDebts(data.debts || [])
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

  const handleDebtChange = (index: number, field: keyof EditableDebt, value: any) => {
    setDebts(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value, isModified: true }
      return updated
    })
    setError(null)
    setSuccess(false)
  }

  const addNewDebt = () => {
    const now = new Date()
    const newDebt: EditableDebt = {
      id: `new-${Date.now()}`,
      periodMonth: now.getMonth() + 1,
      periodYear: now.getFullYear(),
      amount: 0,
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 10).toISOString(),
      paidAmount: 0,
      status: 'active',
      lateFee: 0,
      description: null,
      isNew: true
    }
    setDebts(prev => [...prev, newDebt])
  }

  const deleteDebt = (index: number) => {
    setDebts(prev => {
      const updated = [...prev]
      if (updated[index].isNew) {
        // Remove new debt completely
        return updated.filter((_, i) => i !== index)
      } else {
        // Mark existing debt for deletion
        updated[index] = { ...updated[index], isDeleted: true }
        return updated
      }
    })
  }

  const restoreDebt = (index: number) => {
    setDebts(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], isDeleted: false }
      return updated
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Update member info
      const memberRes = await fetch(`/api/bpjs/members/${memberId}`, {
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

      if (!memberRes.ok) {
        const data = await memberRes.json()
        throw new Error(data.error || 'Gagal menyimpan data peserta')
      }

      // Process debt changes
      for (const debt of debts) {
        if (debt.isDeleted && !debt.isNew) {
          // Delete existing debt
          await fetch(`/api/bpjs/debts/${debt.id}`, { method: 'DELETE' })
        } else if (debt.isNew && !debt.isDeleted) {
          // Create new debt
          await fetch('/api/bpjs/debts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberId,
              periodMonth: debt.periodMonth,
              periodYear: debt.periodYear,
              amount: debt.amount,
              dueDate: debt.dueDate,
              status: debt.status,
              lateFee: debt.lateFee || 0,
              description: debt.description
            })
          })
        } else if (debt.isModified && !debt.isNew && !debt.isDeleted) {
          // Update existing debt
          await fetch(`/api/bpjs/debts/${debt.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: debt.amount,
              dueDate: debt.dueDate,
              paidAmount: debt.paidAmount,
              status: debt.status,
              lateFee: debt.lateFee,
              description: debt.description
            })
          })
        }
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/dashboard/members/${memberId}`)
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menyimpan')
    }
    setSaving(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
  }

  const totalDebt = debts
    .filter(d => !d.isDeleted && (d.status === 'active' || d.status === 'overdue'))
    .reduce((sum, d) => sum + (d.amount - (d.paidAmount || 0)) + (d.lateFee || 0), 0)

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
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Member Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Informasi Peserta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </CardContent>
                </Card>

                {/* Debt Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Daftar Tunggakan ({debts.filter(d => !d.isDeleted).length})
                      </CardTitle>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Total Tunggakan</p>
                          <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebt)}</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addNewDebt}>
                          <Plus className="h-4 w-4 mr-1" />
                          Tambah
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {debts.filter(d => !d.isDeleted).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Tidak ada tunggakan. Klik "Tambah" untuk menambah tunggakan baru.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {debts.map((debt, index) => !debt.isDeleted && (
                          <div key={debt.id} className={`p-4 border rounded-lg ${debt.isNew ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {debt.isNew && <Badge className="bg-green-500">Baru</Badge>}
                                <span className="font-medium">Periode</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteDebt(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Bulan</label>
                                <select
                                  value={debt.periodMonth}
                                  onChange={(e) => handleDebtChange(index, 'periodMonth', parseInt(e.target.value))}
                                  className="w-full px-2 py-1.5 border rounded text-sm"
                                >
                                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                    <option key={m} value={m}>
                                      {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][m-1]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Tahun</label>
                                <input
                                  type="number"
                                  value={debt.periodYear}
                                  onChange={(e) => handleDebtChange(index, 'periodYear', parseInt(e.target.value))}
                                  className="w-full px-2 py-1.5 border rounded text-sm"
                                  min={2020}
                                  max={2030}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Jumlah (Rp)</label>
                                <input
                                  type="number"
                                  value={debt.amount}
                                  onChange={(e) => handleDebtChange(index, 'amount', parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 border rounded text-sm"
                                  min={0}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Denda (Rp)</label>
                                <input
                                  type="number"
                                  value={debt.lateFee || 0}
                                  onChange={(e) => handleDebtChange(index, 'lateFee', parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 border rounded text-sm"
                                  min={0}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Jatuh Tempo</label>
                                <input
                                  type="date"
                                  value={debt.dueDate?.split('T')[0] || ''}
                                  onChange={(e) => handleDebtChange(index, 'dueDate', e.target.value)}
                                  className="w-full px-2 py-1.5 border rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Dibayar (Rp)</label>
                                <input
                                  type="number"
                                  value={debt.paidAmount || 0}
                                  onChange={(e) => handleDebtChange(index, 'paidAmount', parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 border rounded text-sm"
                                  min={0}
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Status</label>
                                <select
                                  value={debt.status}
                                  onChange={(e) => handleDebtChange(index, 'status', e.target.value)}
                                  className="w-full px-2 py-1.5 border rounded text-sm"
                                >
                                  <option value="active">Aktif</option>
                                  <option value="partial">Sebagian</option>
                                  <option value="paid">Lunas</option>
                                  <option value="overdue">Jatuh Tempo</option>
                                  <option value="written_off">Dihapus</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Sisa</label>
                                <div className="px-2 py-1.5 bg-gray-100 rounded text-sm font-medium text-red-600">
                                  {formatCurrency(debt.amount + (debt.lateFee || 0) - (debt.paidAmount || 0))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

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
                <div className="flex gap-3">
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
              </div>
            </form>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
