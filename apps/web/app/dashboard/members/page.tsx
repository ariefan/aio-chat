"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@workspace/ui/src/index'
import { Button } from '@workspace/ui/src/components/button'
import { Badge } from '@workspace/ui/src/components/badge'
import { DashboardLayout } from '@/components/dashboard/layout'
import { useRouter } from 'next/navigation'
import {
  Search,
  Edit,
  Eye,
  Upload,
  X,
  Download,
  RefreshCw,
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

export default function MembersPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [members, setMembers] = useState<BpjsMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bpjs/members')
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.bpjsId.includes(searchTerm)
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
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
        fetchMembers()
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

  return (
    <DashboardLayout
      title="Peserta BPJS"
      subtitle="Kelola data peserta BPJS Kesehatan"
      onRefresh={fetchMembers}
      loading={loading}
      actions={
        <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      }
    >
      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
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

      {/* Members Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              Memuat data...
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>

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
    </DashboardLayout>
  )
}
