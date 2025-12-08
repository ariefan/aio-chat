"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/protected-route'
import {
  MessageCircle,
  User,
  Bot,
  Clock,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
  Send,
  Phone,
  Video,
  MoreVertical,
  Search,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Button } from '@workspace/ui/src/components/button'
import { Badge } from '@workspace/ui/src/components/badge'

interface Message {
  id: string
  content: string
  direction: 'inbound' | 'outbound'
  messageType: string
  status: string
  sentAt: string | null
  metadata?: {
    ai?: boolean
    verified?: boolean
  }
}

interface MessageThread {
  id: string
  messages: Message[]
  startTime: number
  endTime: number
}

interface Conversation {
  id: string
  userId: string
  status: string
  lastMessageAt: string | null
  createdAt: string
  userName: string | null
  userEmail: string | null
  userPlatformType: string | null
  userPlatformId: string | null
  userStatus: string | null
  lastMessage?: {
    content: string
    direction: string
  } | null
}

interface ConversationDetail {
  conversation: Conversation
  messages: MessageThread[]
  stats: {
    totalMessages: number
    inboundMessages: number
    outboundMessages: number
  }
}

function ConversationsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialConvId = searchParams.get('id') || ''

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string>(initialConvId)
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations?limit=50&includeLastMessage=true')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])

        // Auto-select first if none selected
        if (!selectedId && data.conversations?.length > 0) {
          setSelectedId(data.conversations[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  // Fetch conversation detail
  const fetchConversationDetail = useCallback(async (id: string) => {
    if (!id) return

    setDetailLoading(true)
    try {
      const res = await fetch(`/api/conversations/${id}`)
      if (res.ok) {
        const data = await res.json()
        setConversationDetail(data)
      }
    } catch (error) {
      console.error('Failed to fetch conversation detail:', error)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Fetch detail when selection changes
  useEffect(() => {
    if (selectedId) {
      fetchConversationDetail(selectedId)
    } else {
      setConversationDetail(null)
    }
  }, [selectedId, fetchConversationDetail])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchConversations()
      if (selectedId) {
        fetchConversationDetail(selectedId)
      }
    }, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, selectedId, fetchConversations, fetchConversationDetail])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationDetail?.messages])

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: idLocale })
    } catch {
      return '-'
    }
  }

  const getPlatformBadge = (platform: string | null) => {
    switch (platform) {
      case 'telegram':
        return <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">TG</Badge>
      case 'whatsapp':
        return <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">WA</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0">Verified</Badge>
      case 'active':
        return <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Active</Badge>
      default:
        return null
    }
  }

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      conv.userName?.toLowerCase().includes(query) ||
      conv.userPlatformId?.toLowerCase().includes(query)
    )
  })

  // Flatten messages from threads
  const allMessages = conversationDetail?.messages?.flatMap(thread => thread.messages) || []

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-slate-100">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-4 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>

          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-800">Percakapan</h1>
            <p className="text-xs text-slate-500">Monitor percakapan dengan peserta BPJS</p>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>

          <Button variant="outline" size="sm" onClick={() => fetchConversations()}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Conversation List */}
          <div className="w-80 min-w-[320px] max-w-[400px] bg-white border-r flex flex-col">
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Belum ada percakapan</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedId(conv.id)}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedId === conv.id
                          ? 'bg-green-50 border-l-4 border-green-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">
                              {conv.userName || 'Unknown'}
                            </p>
                            {getPlatformBadge(conv.userPlatformType)}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {getStatusBadge(conv.userStatus)}
                          </div>
                          {conv.lastMessage?.content && (
                            <p className="text-xs text-slate-500 truncate mt-1">
                              {conv.lastMessage.direction === 'outbound' ? '🤖 ' : ''}
                              {conv.lastMessage.content}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(conv.lastMessageAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="p-3 border-t bg-slate-50 text-xs text-slate-500">
              Total: {conversations.length} percakapan
            </div>
          </div>

          {/* Right Panel - Chat View */}
          <div className="flex-1 flex flex-col bg-[#efe7dd]">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Pilih Percakapan</p>
                  <p className="text-sm mt-2">Pilih percakapan dari daftar untuk melihat detail</p>
                </div>
              </div>
            ) : detailLoading && !conversationDetail ? (
              <div className="flex-1 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {/* WhatsApp-like Header */}
                <div className="h-14 bg-[#008069] flex items-center px-4 shrink-0 z-10 shadow-md text-white">
                  <div className="flex items-center flex-1 gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="font-semibold text-[15px] leading-tight">
                        {conversationDetail?.conversation?.userName || 'Unknown'}
                      </h2>
                      <span className="text-[11px] opacity-90 text-white/80">
                        {conversationDetail?.conversation?.userPlatformType?.toUpperCase()} | {conversationDetail?.conversation?.userPlatformId}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {conversationDetail?.conversation?.userStatus === 'verified' && (
                      <Badge className="bg-white/20 text-white text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    <div className="flex items-center gap-4 opacity-90">
                      <Video size={20} />
                      <Phone size={20} />
                      <MoreVertical size={20} />
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-2"
                  style={{
                    backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                    backgroundRepeat: 'repeat',
                  }}
                >
                  {allMessages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-slate-500 bg-white/80 px-4 py-2 rounded-lg">
                        Belum ada pesan
                      </p>
                    </div>
                  ) : (
                    <>
                      {allMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex w-full ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 text-[14px] leading-relaxed shadow-sm relative ${
                              msg.direction === 'outbound'
                                ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                                : 'bg-white text-slate-900 rounded-tl-none'
                            }`}
                          >
                            {msg.direction === 'outbound' && msg.metadata?.ai && (
                              <div className="flex items-center gap-1 text-[10px] mb-1 text-green-700">
                                <Bot className="h-3 w-3" />
                                Jenny AI
                              </div>
                            )}
                            <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                            <div
                              className={`text-[10px] mt-1 text-right flex justify-end items-center gap-1 opacity-60 ${
                                msg.direction === 'outbound' ? 'text-slate-600' : 'text-slate-500'
                              }`}
                            >
                              {formatTime(msg.sentAt)}
                              {msg.direction === 'outbound' && (
                                <span className="text-blue-500 font-bold">&#10003;&#10003;</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Info bar */}
                <div className="p-2 bg-[#f0f2f5] flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Total: {conversationDetail?.stats?.totalMessages || 0} pesan |
                    Masuk: {conversationDetail?.stats?.inboundMessages || 0} |
                    Keluar: {conversationDetail?.stats?.outboundMessages || 0}
                  </span>
                  <span>
                    ID: {selectedId.slice(0, 8)}...
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default function ConversationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-100">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-green-600" />
            <p className="mt-2 text-slate-600">Memuat percakapan...</p>
          </div>
        </div>
      }
    >
      <ConversationsPageContent />
    </Suspense>
  )
}
