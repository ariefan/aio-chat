"use client"

import { useEffect, useRef, useCallback } from 'react'
import { useChatStore, useUIStore } from '@/stores'
import { Message, Conversation } from '@/db'

interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
}

export const useWebSocket = (url?: string) => {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const {
    addMessage,
    updateMessage,
    addConversation,
    setConversations,
    setMessages,
    incrementUnreadCount
  } = useChatStore()

  const { addNotification } = useUIStore()

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return
    }

    const wsUrl = url || `ws://localhost:3001/ws`

    try {
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        console.log('WebSocket connected')
        reconnectAttempts.current = 0
        addNotification({
          type: 'success',
          title: 'Connected',
          message: 'Real-time updates enabled'
        })
      }

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)

        if (!event.wasClean && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)

          addNotification({
            type: 'warning',
            title: 'Connection Lost',
            message: `Reconnecting in ${delay / 1000} seconds...`
          })

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          addNotification({
            type: 'error',
            title: 'Connection Failed',
            message: 'Unable to establish connection. Please refresh the page.'
          })
        }
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        addNotification({
          type: 'error',
          title: 'Connection Error',
          message: 'WebSocket connection encountered an error'
        })
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
    }
  }, [url, addMessage, updateMessage, addConversation, setConversations, setMessages, incrementUnreadCount, addNotification])

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'new_message':
        const newMessage: Message = message.data
        addMessage(newMessage)

        if (newMessage.direction === 'inbound') {
          incrementUnreadCount()
          addNotification({
            type: 'info',
            title: 'New Message',
            message: 'You received a new message',
            duration: 3000
          })
        }
        break

      case 'message_updated':
        const { id, ...updates }: Message & { id: string } = message.data
        updateMessage(id, updates)
        break

      case 'new_conversation':
        const newConversation: Conversation = message.data
        addConversation(newConversation)
        addNotification({
          type: 'info',
          title: 'New Conversation',
          message: `Conversation with ${newConversation.metadata?.customerName || 'Unknown'} started`,
          duration: 3000
        })
        break

      case 'conversations_updated':
        const conversations: Conversation[] = message.data
        setConversations(conversations)
        break

      case 'typing':
        const { conversationId, isTyping, userId } = message.data
        // Handle typing indicators
        console.log(`User ${userId} ${isTyping ? 'is' : 'stopped'} typing in conversation ${conversationId}`)
        break

      case 'operator_assigned':
        const { conversationId: convId, operatorId, operatorName } = message.data
        addNotification({
          type: 'info',
          title: 'Assignment Updated',
          message: `Operator ${operatorName} assigned to conversation`
        })
        break

      case 'connection_established':
        // Initial data load when connection is established
        if (message.data.conversations) {
          setConversations(message.data.conversations)
        }
        if (message.data.messages) {
          setMessages(message.data.messages)
        }
        break

      default:
        console.warn('Unknown WebSocket message type:', message.type)
    }
  }, [addMessage, updateMessage, addConversation, setConversations, setMessages, incrementUnreadCount, addNotification])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (ws.current) {
      ws.current.close(1000, 'Client disconnect')
      ws.current = null
    }
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
      addNotification({
        type: 'warning',
        title: 'Not Connected',
        message: 'Please wait for connection to be established'
      })
    }
  }, [addNotification])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
    connect,
    disconnect,
    sendMessage
  }
}