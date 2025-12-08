"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/src/index'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@workspace/ui/src/components/button'
import { Badge } from '@workspace/ui/src/components/badge'
import { ArrowLeft, User, MessageCircle, RefreshCw } from 'lucide-react'

interface Message {
  id: string
  content: string
  direction: 'inbound' | 'outbound'
  messageType: string
  sentAt: string
  metadata?: any
}

interface MessageThread {
  id: string
  messages: Message[]
  startTime: number
  endTime: number
}

interface ConversationDetail {
  id: string
  userId: string
  userName: string | null
  userPlatformType: string | null
  userPlatformId: string | null
  status: string
  lastMessageAt: string | null
  createdAt: string
}

export default function ConversationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.id as string

  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [stats, setStats] = useState<{ totalMessages: number; inboundMessages: number; outboundMessages: number }>({ totalMessages: 0, inboundMessages: 0, outboundMessages: 0 })
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch conversation with messages
      const convRes = await fetch(`/api/conversations/${conversationId}`)
      if (convRes.ok) {
        const convData = await convRes.json()
        setConversation(convData.conversation)
        setThreads(convData.messages || [])
        setStats(convData.stats || { totalMessages: 0, inboundMessages: 0, outboundMessages: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (conversationId) {
      fetchData()
    }
  }, [conversationId])

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
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900">Detail Percakapan</h1>
                <p className="text-sm text-gray-600">ID: {conversationId?.slice(0, 8)}...</p>
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
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Conversation Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Info Pengguna
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Nama</label>
                    <p className="font-medium">{conversation?.userName || 'Pengguna'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Platform</label>
                    <p>
                      <Badge variant="outline">
                        {conversation?.userPlatformType === 'telegram' ? 'Telegram' : (conversation?.userPlatformType || '-')}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Status</label>
                    <p>
                      <Badge variant={conversation?.status === 'active' ? 'default' : 'secondary'}>
                        {conversation?.status === 'active' ? 'Aktif' : 'Ditutup'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Pesan Terakhir</label>
                    <p className="text-sm">{formatDate(conversation?.lastMessageAt || null)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Dibuat</label>
                    <p className="text-sm">{formatDate(conversation?.createdAt || null)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Messages */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Riwayat Pesan ({stats.totalMessages})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {threads.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Belum ada pesan
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {threads.map((thread) => (
                        <div key={thread.id} className="space-y-2">
                          {thread.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  msg.direction === 'outbound'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {formatDate(msg.sentAt)}
                                  {msg.metadata?.ai && ' (AI)'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
