'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface WebSocketMessage {
  type: string
  data?: any
  id?: string
  timestamp: string
}

interface WebSocketClientOptions {
  onConnected?: (data: any) => void
  onDisconnected?: () => void
  onMessage?: (message: WebSocketMessage) => void
  onError?: (error: Error) => void
  autoReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  reconnectAttempts: number
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private isDestroyed = false
  private messageQueue: WebSocketMessage[] = []
  private subscriptions = new Set<string>()
  private pingInterval: NodeJS.Timeout | null = null

  public options: Required<WebSocketClientOptions>
  private state: WebSocketState = {
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
  }

  constructor(options: WebSocketClientOptions = {}) {
    this.options = {
      onConnected: options.onConnected || (() => {}),
      onDisconnected: options.onDisconnected || (() => {}),
      onMessage: options.onMessage || (() => {}),
      onError: options.onError || (() => {}),
      autoReconnect: options.autoReconnect ?? true,
      reconnectInterval: options.reconnectInterval || 3000,
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect(token: string): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('WebSocket client has been destroyed')
    }

    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return
    }

    this.setState({ isConnecting: true, error: null })

    try {
      const wsUrl = this.getWebSocketUrl(token)
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)

    } catch (error) {
      this.setState({ isConnecting: false, error: 'Failed to create WebSocket connection' })
      this.options.onError(error instanceof Error ? error : new Error('Connection failed'))
      throw error
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isDestroyed = true
    this.clearReconnectTimeout()
    this.clearPingInterval()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }

    this.setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0,
    })
  }

  /**
   * Send message to server
   */
  send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, queuing message:', message)
      this.messageQueue.push(message)
      return
    }

    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
      }
      this.ws.send(JSON.stringify(messageWithTimestamp))
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
      this.options.onError(error instanceof Error ? error : new Error('Failed to send message'))
    }
  }

  /**
   * Subscribe to channels
   */
  subscribe(channels: string[]): void {
    channels.forEach(channel => this.subscriptions.add(channel))
    this.send({
      type: 'subscribe',
      data: { channels },
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Unsubscribe from channels
   */
  unsubscribe(channels: string[]): void {
    channels.forEach(channel => this.subscriptions.delete(channel))
    this.send({
      type: 'unsubscribe',
      data: { channels },
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Send typing start notification
   */
  sendTypingStart(conversationId: string): void {
    this.send({
      type: 'typing_start',
      data: { conversationId },
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Send typing stop notification
   */
  sendTypingStop(conversationId: string): void {
    this.send({
      type: 'typing_stop',
      data: { conversationId },
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Mark messages as read
   */
  markRead(messageIds: string[], conversationId: string): void {
    this.send({
      type: 'mark_read',
      data: { messageIds, conversationId },
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    return { ...this.state }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state.isConnected
  }

  private getWebSocketUrl(token: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/api/websocket?token=${encodeURIComponent(token)}`
  }

  private setState(updates: Partial<WebSocketState>): void {
    this.state = { ...this.state, ...updates }
  }

  private handleOpen(): void {
    console.log('🔌 WebSocket connected')
    this.setState({ isConnected: true, isConnecting: false, reconnectAttempts: 0 })
    this.clearReconnectTimeout()

    // Resubscribe to channels
    if (this.subscriptions.size > 0) {
      this.send({
        type: 'subscribe',
        data: { channels: Array.from(this.subscriptions) },
        timestamp: new Date().toISOString(),
      })
    }

    // Send queued messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }

    // Start ping interval
    this.startPingInterval()

    this.options.onConnected({ message: 'Connected to WebSocket server' })
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      console.log('📨 WebSocket message received:', message.type)

      // Handle specific message types
      switch (message.type) {
        case 'connected':
          this.options.onConnected(message.data)
          break

        case 'subscribed':
          console.log('📢 Subscribed to channels:', message.data?.channels)
          break

        case 'unsubscribed':
          console.log('📢 Unsubscribed from channels:', message.data?.channels)
          break

        case 'pong':
          // Pong received, connection is alive
          break

        case 'error':
          console.error('❌ WebSocket error from server:', message.data?.message)
          toast.error(message.data?.message || 'WebSocket error')
          break

        case 'typing_start':
        case 'typing_stop':
        case 'new_message':
        case 'conversation_updated':
        case 'automation_executed':
        case 'messages_read':
          // These will be handled by the onMessage callback
          break

        default:
          console.log('📨 Unknown WebSocket message type:', message.type)
      }

      this.options.onMessage(message)
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error)
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log(`🔌 WebSocket disconnected: ${event.code} - ${event.reason}`)
    this.ws = null
    this.clearPingInterval()

    this.setState({
      isConnected: false,
      isConnecting: false,
      error: event.code !== 1000 ? `Disconnected: ${event.reason}` : null,
    })

    this.options.onDisconnected()

    // Auto reconnect if enabled and not a normal closure
    if (
      this.options.autoReconnect &&
      !this.isDestroyed &&
      event.code !== 1000 &&
      this.reconnectAttempts < this.options.maxReconnectAttempts
    ) {
      this.scheduleReconnect()
    }
  }

  private handleError(event: Event): void {
    console.error('❌ WebSocket error:', event)
    this.setState({ error: 'WebSocket connection error' })
    this.options.onError(new Error('WebSocket connection error'))
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts}`)

    this.setState({ reconnectAttempts: this.reconnectAttempts })

    this.reconnectTimeout = setTimeout(() => {
      if (!this.isDestroyed) {
        console.log(`🔄 Reconnecting... (attempt ${this.reconnectAttempts})`)
        // Token would need to be refreshed here
        this.connect('').catch(error => {
          console.error('❌ Reconnect failed:', error)
        })
      }
    }, this.options.reconnectInterval)
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  private startPingInterval(): void {
    this.clearPingInterval()
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'ping',
          timestamp: new Date().toISOString(),
        })
      }
    }, 30000) // 30 seconds
  }

  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
}

/**
 * React hook for WebSocket connection
 */
export function useWebSocket(options: WebSocketClientOptions = {}) {
  const { data: session } = useSession()
  const [client] = useState(() => new WebSocketClient(options))
  const [state, setState] = useState(client.getState())
  const lastMessageRef = useRef<WebSocketMessage | null>(null)

  // Update client options if they change
  useEffect(() => {
    // This is a bit hacky, but for this use case it's acceptable
    Object.assign(client.options, options)
  }, [options, client])

  // Connect when session is available
  useEffect(() => {
    if (session?.user) {
      // Use the session token for WebSocket authentication
      client.connect(session.user.id || '').catch(error => {
        console.error('Failed to connect WebSocket:', error)
      })
    }

    return () => {
      client.disconnect()
    }
  }, [session, client])

  // Listen to state changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = client.getState()
      if (JSON.stringify(currentState) !== JSON.stringify(state)) {
        setState(currentState)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [client, state])

  // Message handling
  useEffect(() => {
    const handleNewMessage = (message: WebSocketMessage) => {
      lastMessageRef.current = message
    }

    // Register message handler
    const originalOnMessage = client.options.onMessage
    client.options.onMessage = (message) => {
      handleNewMessage(message)
      originalOnMessage(message)
    }

    return () => {
      client.options.onMessage = originalOnMessage
    }
  }, [client])

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    client.send(message as WebSocketMessage)
  }, [client])

  const subscribe = useCallback((channels: string[]) => {
    client.subscribe(channels)
  }, [client])

  const unsubscribe = useCallback((channels: string[]) => {
    client.unsubscribe(channels)
  }, [client])

  const sendTypingStart = useCallback((conversationId: string) => {
    client.sendTypingStart(conversationId)
  }, [client])

  const sendTypingStop = useCallback((conversationId: string) => {
    client.sendTypingStop(conversationId)
  }, [client])

  const markRead = useCallback((messageIds: string[], conversationId: string) => {
    client.markRead(messageIds, conversationId)
  }, [client])

  return {
    client,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    reconnectAttempts: state.reconnectAttempts,
    lastMessage: lastMessageRef.current,
    sendMessage,
    subscribe,
    unsubscribe,
    sendTypingStart,
    sendTypingStop,
    markRead,
  }
}