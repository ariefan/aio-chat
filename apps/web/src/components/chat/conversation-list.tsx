'use client'

import { useState, useEffect } from 'react'
import { Badge, Button, Card, CardContent, Input, ScrollArea } from '@workspace/ui'
import {
  MessageCircle,
  Search,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Conversation {
  id: string
  userId: string
  userName: string
  userPlatform?: string
  platformType: 'telegram' | 'whatsapp' | 'email'
  status: 'active' | 'archived' | 'pending'
  lastMessageAt: string
  lastMessagePreview?: string
  unreadCount: number
  assignedOperatorId?: string
  assignedOperatorName?: string
  messageCount: number
  priority: 'low' | 'medium' | 'high'
  tags?: string[]
}

interface ConversationListProps {
  selectedConversationId?: string
  onConversationSelect: (conversationId: string) => void
  onRefresh: () => void
}

export function ConversationList({
  selectedConversationId,
  onConversationSelect,
  onRefresh
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: '1',
        limit: '50',
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      })

      const response = await fetch(`/api/conversations?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }

      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Failed to fetch conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [searchQuery, statusFilter])

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'archived':
        return <XCircle className="h-4 w-4 text-gray-500" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  // Get platform icon
  const getPlatformIcon = (platformType: string) => {
    switch (platformType) {
      case 'telegram':
        return <div className="w-4 h-4 bg-blue-500 rounded-full" />
      case 'whatsapp':
        return <div className="w-4 h-4 bg-green-500 rounded-full" />
      case 'email':
        return <div className="w-4 h-4 bg-gray-500 rounded-full" />
      default:
        return <MessageCircle className="h-4 w-4 text-gray-400" />
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading && conversations.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 h-24" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversations
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchConversations()
              onRefresh()
            }}
          >
            Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {error && (
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {conversations.length === 0 && !loading ? (
          <div className="p-8 text-center">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No conversations found</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedConversationId === conversation.id
                    ? 'bg-blue-50 border-blue-200'
                    : ''
                }`}
                onClick={() => onConversationSelect(conversation.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left side - User info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(conversation.platformType)}
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">
                            {conversation.userName}
                          </p>
                          {conversation.userPlatform && (
                            <Badge variant="outline" className="text-xs">
                              {conversation.userPlatform}
                            </Badge>
                          )}
                        </div>

                        {conversation.lastMessagePreview && (
                          <p className="text-xs text-gray-600 truncate">
                            {conversation.lastMessagePreview}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side - Status and metadata */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(conversation.status)}
                        <Badge
                          variant="outline"
                          className={`text-xs ${getPriorityColor(conversation.priority)}`}
                        >
                          {conversation.priority}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                          addSuffix: true,
                        })}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{conversation.messageCount} msgs</span>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>

                      {conversation.assignedOperatorName && (
                        <div className="text-xs text-gray-500">
                          {conversation.assignedOperatorName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {conversation.tags && conversation.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {conversation.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}