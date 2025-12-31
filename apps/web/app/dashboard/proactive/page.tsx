'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input } from '@workspace/ui'
import {
  Bell,
  Send,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Calendar,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/ui/status-badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptySection } from '@/components/ui/empty-state'
import { formatRelativeTime } from '@/lib/utils'

interface ProactiveMessage {
  id: string
  memberId: string
  memberName: string
  memberBpjsId: string
  messageType: string
  scheduledAt: string
  sentAt?: string
  content: string
  status: string
  retryCount: number
}

interface BpjsMember {
  id: string
  bpjsId: string
  name: string
}

export default function ProactivePage() {
  const [messages, setMessages] = useState<ProactiveMessage[]>([])
  const [members, setMembers] = useState<BpjsMember[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedMessageType, setSelectedMessageType] = useState<string>('reminder_7d')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const url = statusFilter === 'all'
        ? '/api/bpjs/proactive'
        : `/api/bpjs/proactive?status=${statusFilter}`
      const res = await fetch(url)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/bpjs/members?limit=100')
      const data = await res.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error('Failed to fetch members:', error)
    }
  }

  useEffect(() => {
    fetchMessages()
    fetchMembers()
  }, [statusFilter])

  const runScheduler = async () => {
    try {
      setActionLoading(true)
      const res = await fetch('/api/bpjs/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_scheduler' }),
      })
      const data = await res.json()
      toast.success('Scheduler Selesai', {
        description: `Generated: ${data.generated} | Sent: ${data.sent}`,
      })
      fetchMessages()
    } catch (error) {
      console.error('Failed to run scheduler:', error)
      toast.error('Gagal Menjalankan Scheduler', {
        description: 'Terjadi kesalahan saat menjalankan scheduler',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const sendPending = async () => {
    try {
      setActionLoading(true)
      const res = await fetch('/api/bpjs/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_pending' }),
      })
      const data = await res.json()
      toast.success('Pesan Terkirim', {
        description: `Berhasil mengirim ${data.sent} pesan`,
      })
      fetchMessages()
    } catch (error) {
      console.error('Failed to send pending:', error)
      toast.error('Gagal Mengirim', {
        description: 'Terjadi kesalahan saat mengirim pesan',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const triggerMessage = async () => {
    if (!selectedMemberId) {
      toast.warning('Pilih Peserta', {
        description: 'Pilih peserta terlebih dahulu sebelum mengirim pesan test',
      })
      return
    }

    try {
      setActionLoading(true)
      const res = await fetch('/api/bpjs/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger',
          memberId: selectedMemberId,
          messageType: selectedMessageType,
        }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Pesan Test Terkirim', {
          description: 'Pesan berhasil dikirim ke peserta',
        })
        fetchMessages()
      } else {
        toast.error('Gagal Mengirim', {
          description: 'Pesan gagal dikirim',
        })
      }
    } catch (error) {
      console.error('Failed to trigger message:', error)
      toast.error('Gagal Mengirim', {
        description: 'Terjadi kesalahan saat mengirim pesan',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'reminder_7d':
        return '7 Hari Sebelum'
      case 'reminder_3d':
        return '3 Hari Sebelum'
      case 'reminder_1d':
        return '1 Hari Sebelum'
      case 'overdue':
        return 'Terlambat'
      default:
        return type
    }
  }

  const messageTypeOptions = [
    { value: 'reminder_7d', label: 'Pengingat 7 Hari' },
    { value: 'reminder_3d', label: 'Pengingat 3 Hari' },
    { value: 'reminder_1d', label: 'Pengingat 1 Hari' },
    { value: 'overdue', label: 'Notifikasi Terlambat' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proactive Messages</h1>
          <p className="text-muted-foreground">
            Kelola pengingat otomatis dan uji fitur proactive chat
          </p>
        </div>
        <Button variant="outline" onClick={fetchMessages}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Run Scheduler */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Run Scheduler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Jalankan scheduler untuk generate pengingat berdasarkan jatuh tempo.
            </p>
            <Button
              className="w-full"
              onClick={runScheduler}
              disabled={actionLoading}
            >
              <Play className="h-4 w-4 mr-2" />
              Run Scheduler
            </Button>
          </CardContent>
        </Card>

        {/* Send Pending */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="h-5 w-5" />
              Kirim Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Kirim semua pesan yang pending ke peserta via Telegram.
            </p>
            <Button
              className="w-full"
              onClick={sendPending}
              disabled={actionLoading}
            >
              <Send className="h-4 w-4 mr-2" />
              Kirim Semua
            </Button>
          </CardContent>
        </Card>

        {/* Manual Trigger */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Test Message
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="w-full p-2 border rounded-md text-sm"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
            >
              <option value="">-- Pilih Peserta --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.bpjsId})
                </option>
              ))}
            </select>
            <select
              className="w-full p-2 border rounded-md text-sm"
              value={selectedMessageType}
              onChange={(e) => setSelectedMessageType(e.target.value)}
            >
              {messageTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button
              className="w-full"
              onClick={triggerMessage}
              disabled={actionLoading || !selectedMemberId}
            >
              <Send className="h-4 w-4 mr-2" />
              Kirim Test
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Riwayat Pesan ({messages.length})
            </CardTitle>
            <select
              className="p-2 border rounded-md text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="sent">Terkirim</option>
              <option value="failed">Gagal</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner size="md" text="Memuat pesan..." centered />
          ) : messages.length === 0 ? (
            <EmptySection
              icon={Bell}
              title="Tidak ada pesan proaktif"
              description={statusFilter !== 'all' ? `Tidak ada pesan dengan status ${statusFilter}` : 'Jalankan scheduler untuk membuat pesan'}
            />
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">{msg.memberName}</p>
                      <p className="text-sm text-muted-foreground">
                        {msg.memberBpjsId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getTypeLabel(msg.messageType)}</Badge>
                      <StatusBadge status={msg.status} type="message" />
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md text-sm whitespace-pre-wrap mb-2">
                    {msg.content.slice(0, 200)}
                    {msg.content.length > 200 && '...'}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Dijadwalkan: {formatRelativeTime(msg.scheduledAt)}
                      </span>
                      {msg.sentAt && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Dikirim: {formatRelativeTime(msg.sentAt)}
                        </span>
                      )}
                    </div>
                    {msg.retryCount > 0 && (
                      <span className="text-red-500">
                        Retry: {msg.retryCount}x
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
