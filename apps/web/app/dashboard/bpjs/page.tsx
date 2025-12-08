'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input } from '@workspace/ui'
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  CreditCard,
} from 'lucide-react'

interface BpjsMember {
  id: string
  bpjsId: string
  name: string
  nik: string
  phone?: string
  email?: string
  memberClass: string
  status: string
  totalDebt: number
  overdueCount: number
  debtCount: number
}

interface BpjsDebt {
  id: string
  periodMonth: number
  periodYear: number
  amount: number
  dueDate: string
  paidAmount: number
  status: string
  lateFee: number
}

export default function BpjsManagementPage() {
  const [members, setMembers] = useState<BpjsMember[]>([])
  const [selectedMember, setSelectedMember] = useState<BpjsMember | null>(null)
  const [memberDebts, setMemberDebts] = useState<BpjsDebt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDebtModal, setShowDebtModal] = useState(false)

  // New member form
  const [newMember, setNewMember] = useState({
    bpjsId: '',
    name: '',
    nik: '',
    phone: '',
    email: '',
    memberClass: '3',
  })

  // New debt form
  const [newDebt, setNewDebt] = useState({
    periodMonth: new Date().getMonth() + 1,
    periodYear: new Date().getFullYear(),
    amount: 42000,
    dueDate: '',
  })

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/bpjs/members?search=${search}`)
      const data = await res.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMemberDebts = async (memberId: string) => {
    try {
      const res = await fetch(`/api/bpjs/members/${memberId}`)
      const data = await res.json()
      setMemberDebts(data.debts || [])
    } catch (error) {
      console.error('Failed to fetch debts:', error)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [search])

  useEffect(() => {
    if (selectedMember) {
      fetchMemberDebts(selectedMember.id)
    }
  }, [selectedMember])

  const handleAddMember = async () => {
    try {
      const res = await fetch('/api/bpjs/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      })

      if (res.ok) {
        setShowAddModal(false)
        setNewMember({
          bpjsId: '',
          name: '',
          nik: '',
          phone: '',
          email: '',
          memberClass: '3',
        })
        fetchMembers()
      }
    } catch (error) {
      console.error('Failed to add member:', error)
    }
  }

  const handleAddDebt = async () => {
    if (!selectedMember) return

    try {
      const res = await fetch('/api/bpjs/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMember.id,
          ...newDebt,
        }),
      })

      if (res.ok) {
        setShowDebtModal(false)
        fetchMemberDebts(selectedMember.id)
        fetchMembers()
      }
    } catch (error) {
      console.error('Failed to add debt:', error)
    }
  }

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Yakin hapus peserta ini?')) return

    try {
      await fetch(`/api/bpjs/members/${id}`, { method: 'DELETE' })
      fetchMembers()
      if (selectedMember?.id === id) {
        setSelectedMember(null)
      }
    } catch (error) {
      console.error('Failed to delete member:', error)
    }
  }

  const handleMarkPaid = async (debtId: string, amount: number) => {
    try {
      await fetch(`/api/bpjs/debts/${debtId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentMethod: 'manual',
        }),
      })
      if (selectedMember) {
        fetchMemberDebts(selectedMember.id)
        fetchMembers()
      }
    } catch (error) {
      console.error('Failed to mark paid:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Aktif</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Terlambat</Badge>
      case 'paid':
        return <Badge className="bg-blue-100 text-blue-800">Lunas</Badge>
      case 'suspended':
        return <Badge className="bg-yellow-100 text-yellow-800">Ditangguhkan</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data BPJS Kesehatan</h1>
          <p className="text-muted-foreground">Kelola data peserta dan tunggakan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMembers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Peserta
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau nomor BPJS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Daftar Peserta ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Memuat...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tidak ada data peserta
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedMember?.id === member.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.bpjsId} • Kelas {member.memberClass}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(member.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteMember(member.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    {member.totalDebt > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600 font-medium">
                          Tunggakan: Rp {member.totalDebt.toLocaleString('id-ID')}
                        </span>
                        {member.overdueCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {member.overdueCount} terlambat
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Member Details & Debts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Detail Tunggakan
              </span>
              {selectedMember && (
                <Button size="sm" onClick={() => setShowDebtModal(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedMember ? (
              <div className="text-center py-8 text-muted-foreground">
                Pilih peserta untuk melihat tunggakan
              </div>
            ) : (
              <div className="space-y-4">
                {/* Member info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedMember.name}</p>
                  <p className="text-sm text-muted-foreground">
                    BPJS: {selectedMember.bpjsId}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    NIK: {selectedMember.nik}
                  </p>
                </div>

                {/* Debts list */}
                {memberDebts.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    Tidak ada tunggakan
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memberDebts.map((debt) => (
                      <div
                        key={debt.id}
                        className="p-3 border rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {months[debt.periodMonth - 1]} {debt.periodYear}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Jatuh tempo: {new Date(debt.dueDate).toLocaleDateString('id-ID')}
                            </p>
                          </div>
                          {getStatusBadge(debt.status)}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-lg">
                              Rp {debt.amount.toLocaleString('id-ID')}
                            </p>
                            {debt.lateFee > 0 && (
                              <p className="text-xs text-red-500">
                                + Denda: Rp {debt.lateFee.toLocaleString('id-ID')}
                              </p>
                            )}
                          </div>
                          {debt.status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkPaid(debt.id, debt.amount + (debt.lateFee || 0))}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Bayar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Tambah Peserta BPJS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Nomor BPJS (13 digit)"
                value={newMember.bpjsId}
                onChange={(e) => setNewMember({ ...newMember, bpjsId: e.target.value })}
              />
              <Input
                placeholder="Nama Lengkap"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              />
              <Input
                placeholder="NIK"
                value={newMember.nik}
                onChange={(e) => setNewMember({ ...newMember, nik: e.target.value })}
              />
              <Input
                placeholder="No. HP"
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
              />
              <Input
                placeholder="Email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              />
              <select
                className="w-full p-2 border rounded-md"
                value={newMember.memberClass}
                onChange={(e) => setNewMember({ ...newMember, memberClass: e.target.value })}
              >
                <option value="1">Kelas 1 - Rp 150.000</option>
                <option value="2">Kelas 2 - Rp 100.000</option>
                <option value="3">Kelas 3 - Rp 42.000</option>
              </select>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Batal
                </Button>
                <Button onClick={handleAddMember}>
                  Simpan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Debt Modal */}
      {showDebtModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Tambah Tunggakan - {selectedMember.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="p-2 border rounded-md"
                  value={newDebt.periodMonth}
                  onChange={(e) => setNewDebt({ ...newDebt, periodMonth: parseInt(e.target.value) })}
                >
                  {months.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  placeholder="Tahun"
                  value={newDebt.periodYear}
                  onChange={(e) => setNewDebt({ ...newDebt, periodYear: parseInt(e.target.value) })}
                />
              </div>
              <Input
                type="number"
                placeholder="Jumlah (Rp)"
                value={newDebt.amount}
                onChange={(e) => setNewDebt({ ...newDebt, amount: parseInt(e.target.value) })}
              />
              <Input
                type="date"
                placeholder="Jatuh Tempo"
                value={newDebt.dueDate}
                onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDebtModal(false)}>
                  Batal
                </Button>
                <Button onClick={handleAddDebt}>
                  Simpan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
