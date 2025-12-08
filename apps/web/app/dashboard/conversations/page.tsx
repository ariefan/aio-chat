'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@workspace/ui'
import {
  MessageCircle,
  User,
  Bot,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { DashboardLayout } from '@/components/dashboard/layout'

interface Message {
  id: string
  content: string
  direction: 'inbound' | 'outbound'
  messageType: string
  status: string
  sentAt: string
  metadata?: {
    ai?: boolean
    verified?: boolean
    memberInfo?: {
      bpjsId: string
      name: string
    }
  }
}

interface Conversation {
  id: string
  status: string
  lastMessageAt: string
  createdAt: string
  user: {
    id: string
    name: string
    platformId: string
    platformType: string
    status: string
  }
  messages: Message[]
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations?limit=50&include=user,messages')
      const data = await res.json()
      setConversations(data.conversations || [])

      // Auto-select first if none selected
      if (!selectedConversation && data.conversations?.length > 0) {
        setSelectedConversation(data.conversations[0])
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchConversationDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`)
      const data = await res.json()
      setSelectedConversation(data)

      // Update in list
      setConversations(prev =>
        prev.map(c => c.id === id ? data : c)
      )
    } catch (error) {
      console.error('Failed to fetch conversation:', error)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchConversations()
      if (selectedConversation) {
        fetchConversationDetail(selectedConversation.id)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh, selectedConversation?.id])

  // Scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedConversation?.messages])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Aktif</Badge>
      case 'verified':
        return <Badge className="bg-blue-100 text-blue-800">Terverifikasi</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'closed':
        return <Badge className="bg-gray-100 text-gray-800">Selesai</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'telegram':
        return <Badge className="bg-blue-500 text-white">Telegram</Badge>
      case 'whatsapp':
        return <Badge className="bg-green-500 text-white">WhatsApp</Badge>
      default:
        return <Badge>{platform}</Badge>
    }
  }

  return (
    <DashboardLayout
      title="Percakapan"
      subtitle="Monitor percakapan RICH dengan peserta BPJS"
      onRefresh={fetchConversations}
      loading={loading}
      actions={
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded"
          />
          Auto-refresh
        </label>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1 overflow-hidden flex flex-col">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Percakapan ({conversations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Memuat...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada percakapan
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv)
                      fetchConversationDetail(conv.id)
                    }}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedConversation?.id === conv.id
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">{conv.user?.name || 'Unknown'}</p>
                          <div className="flex items-center gap-2">
                            {getPlatformBadge(conv.user?.platformType || 'telegram')}
                            {getStatusBadge(conv.user?.status || 'pending')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {conv.lastMessageAt
                        ? formatDistanceToNow(new Date(conv.lastMessageAt), {
                            addSuffix: true,
                            locale: idLocale,
                          })
                        : 'Tidak ada pesan'}
                    </div>
                    {conv.messages?.[0] && (
                      <p className="mt-1 text-sm text-muted-foreground truncate">
                        {conv.messages[0].direction === 'outbound' ? '🤖 ' : ''}
                        {conv.messages[0].content.slice(0, 50)}...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat View */}
        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
          <CardHeader className="py-3 border-b">
            <CardTitle className="text-lg flex items-center justify-between">
              {selectedConversation ? (
                <>
                  <span className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Chat dengan {selectedConversation.user?.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedConversation.user?.status === 'verified' && (
                      <Badge className="bg-blue-100 text-blue-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Terverifikasi
                      </Badge>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-muted-foreground">Pilih percakapan</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {!selectedConversation ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Pilih percakapan untuk melihat detail</p>
                </div>
              </div>
            ) : selectedConversation.messages?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>Belum ada pesan</p>
              </div>
            ) : (
              <>
                {[...selectedConversation.messages].reverse().map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.direction === 'outbound'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {msg.direction === 'outbound' && msg.metadata?.ai && (
                        <div className="flex items-center gap-1 text-xs mb-1 opacity-80">
                          <Bot className="h-3 w-3" />
                          RICH AI
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <div
                        className={`text-xs mt-1 ${
                          msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatDistanceToNow(new Date(msg.sentAt), {
                          addSuffix: true,
                          locale: idLocale,
                        })}
                        {msg.metadata?.verified && (
                          <span className="ml-2">Terverifikasi</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Info bar */}
          {selectedConversation && (
            <div className="border-t p-3 bg-gray-50 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>
                  Platform: {selectedConversation.user?.platformType?.toUpperCase()} |
                  ID: {selectedConversation.user?.platformId}
                </span>
                <span>
                  Total pesan: {selectedConversation.messages?.length || 0}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
