'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, ScrollArea, Separator, Badge } from '@workspace/ui'
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Info,
  Search,
  Filter,
  User,
  Bot,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  Wifi,
  WifiOff
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { ConversationList } from './conversation-list'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { useWebSocket } from '@/lib/websocket/client'
import { toast } from 'sonner'

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

interface Message {
  id: string
  conversationId: string
  content: string
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video'
  direction: 'inbound' | 'outbound'
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  platformMessageId?: string
  platformType: 'telegram' | 'whatsapp' | 'email'
  userId?: string
  operatorId?: string
  attachments?: Array<{
    id: string
    type: 'image' | 'document' | 'audio' | 'video'
    url: string
    fileName?: string
    fileSize?: number
    mimeType?: string
    caption?: string
    thumbnailUrl?: string
    duration?: number
  }>
  metadata?: Record<string, any>
  isDeleted?: boolean
  editedAt?: string
  replyToMessageId?: string
  replyToMessage?: {
    id: string
    content: string
    messageType: string
  }
  reactions?: Array<{
    emoji: string
    count: number
    userId?: string
  }>
}

interface ChatViewProps {
  className?: string
  initialConversationId?: string
}

export function ChatView({ className, initialConversationId }: ChatViewProps) {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConversationList, setShowConversationList] = useState(true)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // WebSocket integration
  const { isConnected, sendTypingStart, sendTypingStop, subscribe, unsubscribe } = useWebSocket({
    onMessage: useCallback((message: any) => {
      switch (message.type) {
        case 'new_message':
          if (selectedConversation && message.data?.conversationId === selectedConversation.id) {
            setMessages(prev => [...prev, message.data])
            toast.success('New message received')
          }
          break
        case 'typing_start':
          if (selectedConversation && message.data?.conversationId === selectedConversation.id) {
            setTypingUsers(prev => new Set([...prev, message.data?.operatorName]))
          }
          break
        case 'typing_stop':
          if (selectedConversation && message.data?.conversationId === selectedConversation.id) {
            setTypingUsers(prev => {
              const newSet = new Set(prev)
              newSet.delete(message.data?.operatorName)
              return newSet
            })
          }
          break
        case 'conversation_updated':
          if (selectedConversation && message.data?.id === selectedConversation.id) {
            setSelectedConversation(message.data)
          }
          break
      }
    }, [selectedConversation]),
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize with conversation if provided
  useEffect(() => {
    if (initialConversationId && !selectedConversation) {
      fetchConversation(initialConversationId)
    }
  }, [initialConversationId])

  // WebSocket connection for real-time updates
  useEffect(() => {
    // This will be implemented in Phase 2.4
    // For now, we'll poll for updates
    const interval = setInterval(() => {
      if (selectedConversation) {
        fetchMessages(selectedConversation.id)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [selectedConversation])

  // Fetch conversation details
  const fetchConversation = async (conversationId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/conversations/${conversationId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch conversation')
      }

      const conversation = await response.json()
      setSelectedConversation(conversation)
      setShowConversationList(false)
      await fetchMessages(conversationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      toast.error('Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }

  // Fetch messages for conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(
        `/api/messages?conversationId=${conversationId}&limit=50`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const data = await response.json()
      const newMessages = data.messages || []

      // Only update if we have new messages
      if (newMessages.length !== messages.length) {
        setMessages(newMessages)
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
      // Don't show toast for polling errors to avoid spam
    }
  }

  // Send new message
  const handleSendMessage = async (messageData: {
    conversationId: string
    content: string
    messageType: 'text' | 'image' | 'document' | 'audio' | 'video'
    direction: 'outbound'
    platformType: 'telegram' | 'whatsapp' | 'email'
    attachments?: Array<{
      id: string
      type: 'image' | 'document' | 'audio' | 'video'
      url: string
      fileName?: string
      fileSize?: number
      mimeType?: string
    }>
  }) => {
    try {
      // Add optimistic message to UI
      const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        ...messageData,
        status: 'pending',
        timestamp: new Date().toISOString(),
      }

      setMessages(prev => [...prev, optimisticMessage])

      // Send to server
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const sentMessage = await response.json()

      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(msg =>
          msg.id === optimisticMessage.id ? sentMessage : msg
        )
      )

      toast.success('Message sent')
    } catch (err) {
      // Remove optimistic message and show error
      setMessages(prev =>
        prev.filter(msg => msg.id !== `temp_${Date.now()}`)
      )
      toast.error('Failed to send message')
    }
  }

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (isConnected && selectedConversation) {
      sendTypingStart(selectedConversation.id)
    }
  }, [isConnected, selectedConversation, sendTypingStart])

  const handleTypingStop = useCallback(() => {
    if (isConnected && selectedConversation) {
      sendTypingStop(selectedConversation.id)
    }
  }, [isConnected, selectedConversation, sendTypingStop])

  // Message actions
  const handleReply = useCallback((messageId: string) => {
    // Will be implemented with reply functionality
    console.log('Reply to message:', messageId)
  }, [])

  const handleForward = useCallback((messageId: string) => {
    // Will be implemented with forward functionality
    console.log('Forward message:', messageId)
  }, [])

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Message copied to clipboard')
  }, [])

  const handleDelete = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, isDeleted: true } : msg
        )
      )

      toast.success('Message deleted')
    } catch (err) {
      toast.error('Failed to delete message')
    }
  }, [])

  const handleDownload = useCallback((attachment: any) => {
    // Download attachment
    window.open(attachment.url, '_blank')
  }, [])

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      })

      if (!response.ok) {
        throw new Error('Failed to add reaction')
      }

      // Update message with new reaction
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === messageId) {
            const existingReaction = msg.reactions?.find(r => r.emoji === emoji)
            const reactions = msg.reactions || []

            if (existingReaction) {
              existingReaction.count += 1
            } else {
              reactions.push({ emoji, count: 1 })
            }

            return { ...msg, reactions }
          }
          return msg
        })
      )
    } catch (err) {
      toast.error('Failed to add reaction')
    }
  }, [])

  // Handle conversation selection
  const handleConversationSelect = useCallback((conversationId: string) => {
    fetchConversation(conversationId)
  }, [])

  // Handle back to conversation list
  const handleBackToList = useCallback(() => {
    setSelectedConversation(null)
    setMessages([])
    setShowConversationList(true)
  }, [])

  // Mark conversation as read
  useEffect(() => {
    if (selectedConversation && selectedConversation.unreadCount > 0) {
      // This would mark messages as read via API
      console.log('Marking conversation as read:', selectedConversation.id)
    }
  }, [selectedConversation])

  if (showConversationList) {
    return (
      <div className="h-full flex">
        <ConversationList
          selectedConversationId={selectedConversation?.id}
          onConversationSelect={handleConversationSelect}
          onRefresh={() => console.log('Refresh conversations')}
        />
      </div>
    )
  }

  if (loading && !selectedConversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    )
  }

  if (error && !selectedConversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => setShowConversationList(true)}>
                Back to Conversations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Chat header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {selectedConversation && (
              <>
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{selectedConversation.userName}</h3>
                    <Badge variant="outline" className="text-xs">
                      {selectedConversation.platformType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {selectedConversation.messageCount} messages
                    </span>
                    {typingUsers.size > 0 && (
                      <span className="text-blue-500">
                        {Array.from(typingUsers).join(', ')} typing...
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* WebSocket connection status */}
            <div className="flex items-center gap-1">
              {isConnected ? (
                <span title="Connected">
                  <Wifi className="h-4 w-4 text-green-500" />
                </span>
              ) : (
                <span title="Disconnected">
                  <WifiOff className="h-4 w-4 text-gray-400" />
                </span>
              )}
            </div>

            {selectedConversation?.assignedOperatorName && (
              <Badge variant="secondary" className="text-xs">
                {selectedConversation.assignedOperatorName}
              </Badge>
            )}

            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Info className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground">
              Start a conversation with {selectedConversation?.userName}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <Separator className="flex-1" />
              <span className="px-3 text-xs text-muted-foreground bg-background">
                Today
              </span>
              <Separator className="flex-1" />
            </div>

            {messages.map((message, index) => {
              // Check if this message should be grouped with the previous one
              const previousMessage = messages[index - 1]
              const isGrouped = previousMessage &&
                previousMessage.direction === message.direction &&
                new Date(message.timestamp).getTime() - new Date(previousMessage.timestamp).getTime() < 60000 && // 1 minute
                previousMessage.userId === message.userId

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isGrouped={isGrouped}
                  showTimestamp={!isGrouped}
                  showAvatar={!isGrouped}
                  onReply={handleReply}
                  onForward={handleForward}
                  onCopy={handleCopy}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                  onReact={handleReact}
                />
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message input */}
      {selectedConversation && (
        <MessageInput
          conversationId={selectedConversation.id}
          platformType={selectedConversation.platformType}
          onSendMessage={handleSendMessage}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          disabled={false}
        />
      )}
    </div>
  )
}