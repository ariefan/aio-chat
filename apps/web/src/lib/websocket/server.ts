import WebSocket from 'ws'
import { IncomingMessage } from 'http'
import { URL } from 'url'
import { db } from '@/db'
import { operators, sessions } from '@/db/schema'
// @ts-ignore - Dynamic import for WebSocket Server
const { Server } = require('ws')
import { eq, and, isNull } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

interface WebSocketAuthData {
  operatorId: string
  sessionId: string
  role: string
  permissions: string[]
}

interface ClientConnection {
  ws: WebSocket
  operatorId: string
  sessionId: string
  subscriptions: Set<string>
  lastPing: number
  isAlive: boolean
}

interface WebSocketMessage {
  type: string
  data?: any
  id?: string
  timestamp: string
}

export class ChatWebSocketServer {
  private wss: any | null = null
  private clients = new Map<string, ClientConnection>()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isShuttingDown = false

  constructor() {
    this.setupHeartbeat()
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: any) {
    if (this.wss) {
      console.warn('⚠️ WebSocket server already initialized')
      return
    }

    this.wss = new Server({
      server,
      path: '/api/websocket',
      verifyClient: this.verifyClient.bind(this),
    })

    this.wss.on('connection', this.handleConnection.bind(this))
    this.wss.on('error', this.handleError.bind(this))
    this.wss.on('close', this.handleClose.bind(this))

    console.log('🔌 WebSocket server initialized on /api/websocket')
  }

  /**
   * Verify client authentication during connection
   */
  private async verifyClient(info: {
    origin: string
    secure: boolean
    req: IncomingMessage
  }): Promise<boolean> {
    try {
      const url = new URL(info.req.url || '', `http://${info.req.headers.host}`)
      const token = url.searchParams.get('token') ||
                   (info.req.headers.authorization?.replace('Bearer ', ''))

      if (!token) {
        console.warn('🚫 WebSocket connection rejected: No token provided')
        return false
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any
      if (!decoded || !decoded.id) {
        console.warn('🚫 WebSocket connection rejected: Invalid token')
        return false
      }

      // Verify operator exists and is active
      const [operatorData] = await db
        .select()
        .from(operators)
        .where(and(
          eq(operators.id, decoded.id),
          eq(operators.isActive, true)
        ))
        .limit(1)

      if (!operatorData) {
        console.warn('🚫 WebSocket connection rejected: Operator not found or inactive')
        return false
      }

      // Store auth data for connection handler
      ;(info.req as any).authData = {
        operatorId: decoded.id,
        sessionId: decoded.sessionId || 'default',
        role: decoded.role,
        permissions: decoded.permissions || [],
      } as WebSocketAuthData

      console.log(`✅ WebSocket connection verified for operator: ${operatorData.name}`)
      return true

    } catch (error) {
      console.error('❌ WebSocket verification failed:', error)
      return false
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocket, req: IncomingMessage) {
    if (this.isShuttingDown) {
      ws.close(1013, 'Server shutting down')
      return
    }

    const authData = (req as any).authData as WebSocketAuthData
    const clientId = `${authData.operatorId}:${authData.sessionId}`

    // Check for existing connection and close it
    const existingClient = this.clients.get(clientId)
    if (existingClient) {
      console.log(`🔄 Closing existing connection for ${clientId}`)
      existingClient.ws.close(1000, 'New connection established')
    }

    // Create new client connection
    const clientConnection: ClientConnection = {
      ws,
      operatorId: authData.operatorId,
      sessionId: authData.sessionId,
      subscriptions: new Set(),
      lastPing: Date.now(),
      isAlive: true,
    }

    this.clients.set(clientId, clientConnection)

    // Get operator details
    const operator = await db
      .select()
      .from(operators)
      .where(eq(operators.id, authData.operatorId))
      .limit(1)

    console.log(`🔌 WebSocket client connected: ${operator[0]?.name || authData.operatorId}`)

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      data: {
        clientId,
        operator: {
          id: operator[0]?.id,
          name: operator[0]?.name,
          email: operator[0]?.email,
          role: authData.role,
        },
        serverTime: new Date().toISOString(),
      },
    })

    // Set up event handlers for this connection
    ws.on('message', (data) => this.handleMessage(clientId, data))
    ws.on('close', (code, reason) => this.handleDisconnection(clientId, code, reason))
    ws.on('pong', () => this.handlePong(clientId))

    // Subscribe to default channels
    await this.subscribeToDefaults(clientId)
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(clientId: string, data: any) {
    try {
      const client = this.clients.get(clientId)
      if (!client) return

      client.lastPing = Date.now()
      client.isAlive = true

      const message: WebSocketMessage = JSON.parse(data.toString())
      const { type, data: messageData, id } = message

      console.log(`📨 WebSocket message from ${clientId}: ${type}`)

      switch (type) {
        case 'subscribe':
          await this.handleSubscription(clientId, messageData?.channels || [])
          break

        case 'unsubscribe':
          await this.handleUnsubscription(clientId, messageData?.channels || [])
          break

        case 'ping':
          this.sendToClient(clientId, {
            type: 'pong',
            id,
            data: { timestamp: new Date().toISOString() },
          })
          break

        case 'typing_start':
          await this.handleTypingStart(clientId, messageData)
          break

        case 'typing_stop':
          await this.handleTypingStop(clientId, messageData)
          break

        case 'mark_read':
          await this.handleMarkRead(clientId, messageData)
          break

        default:
          console.warn(`❓ Unknown WebSocket message type: ${type}`)
          this.sendToClient(clientId, {
            type: 'error',
            id,
            data: { message: 'Unknown message type' },
          })
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error)
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Failed to process message' },
      })
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string, code: number, reason: Buffer) {
    const client = this.clients.get(clientId)
    if (!client) return

    console.log(`🔌 WebSocket client disconnected: ${clientId} (${code})`)

    this.clients.delete(clientId)

    // Notify other clients about disconnection if needed
    this.broadcast({
      type: 'operator_offline',
      data: {
        operatorId: client.operatorId,
        timestamp: new Date().toISOString(),
      },
    }, { excludeClientId: clientId })
  }

  /**
   * Handle WebSocket server errors
   */
  private handleError(error: Error) {
    console.error('❌ WebSocket server error:', error)
  }

  /**
   * Handle WebSocket server close
   */
  private handleClose() {
    console.log('🔌 WebSocket server closed')
  }

  /**
   * Handle pong response for heartbeat
   */
  private handlePong(clientId: string) {
    const client = this.clients.get(clientId)
    if (client) {
      client.isAlive = true
      client.lastPing = Date.now()
    }
  }

  /**
   * Subscribe client to channels
   */
  private async handleSubscription(clientId: string, channels: string[]) {
    const client = this.clients.get(clientId)
    if (!client) return

    channels.forEach(channel => {
      client.subscriptions.add(channel)
    })

    console.log(`📢 Client ${clientId} subscribed to: ${Array.from(client.subscriptions).join(', ')}`)

    this.sendToClient(clientId, {
      type: 'subscribed',
      data: { channels: Array.from(client.subscriptions) },
    })
  }

  /**
   * Unsubscribe client from channels
   */
  private async handleUnsubscription(clientId: string, channels: string[]) {
    const client = this.clients.get(clientId)
    if (!client) return

    channels.forEach(channel => {
      client.subscriptions.delete(channel)
    })

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      data: { channels: Array.from(client.subscriptions) },
    })
  }

  /**
   * Handle typing start notification
   */
  private async handleTypingStart(clientId: string, data: any) {
    const client = this.clients.get(clientId)
    if (!client) return

    this.broadcast({
      type: 'typing_start',
      data: {
        operatorId: client.operatorId,
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      },
    }, {
      channel: `conversation:${data.conversationId}`,
      excludeClientId: clientId,
    })
  }

  /**
   * Handle typing stop notification
   */
  private async handleTypingStop(clientId: string, data: any) {
    const client = this.clients.get(clientId)
    if (!client) return

    this.broadcast({
      type: 'typing_stop',
      data: {
        operatorId: client.operatorId,
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      },
    }, {
      channel: `conversation:${data.conversationId}`,
      excludeClientId: clientId,
    })
  }

  /**
   * Handle mark as read
   */
  private async handleMarkRead(clientId: string, data: any) {
    const client = this.clients.get(clientId)
    if (!client) return

    // Update message read status in database
    // This would be implemented with actual database updates

    this.broadcast({
      type: 'messages_read',
      data: {
        operatorId: client.operatorId,
        messageIds: data.messageIds,
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      },
    }, {
      channel: `conversation:${data.conversationId}`,
    })
  }

  /**
   * Subscribe to default channels
   */
  private async subscribeToDefaults(clientId: string) {
    const client = this.clients.get(clientId)
    if (!client) return

    // Subscribe to operator-specific channels
    client.subscriptions.add(`operator:${client.operatorId}`)
    client.subscriptions.add('conversations')
    client.subscriptions.add('messages')
    client.subscriptions.add('automation')

    this.sendToClient(clientId, {
      type: 'subscribed',
      data: {
        channels: Array.from(client.subscriptions),
        message: 'Subscribed to default channels',
      },
    })
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WebSocketMessage | Omit<WebSocketMessage, 'timestamp'>) {
    const client = this.clients.get(clientId)
    if (!client || client.ws.readyState !== client.ws.OPEN) {
      return
    }

    try {
      client.ws.send(JSON.stringify(message))
    } catch (error) {
      console.error(`❌ Failed to send message to client ${clientId}:`, error)
      // Consider removing client if connection is broken
    }
  }

  /**
   * Broadcast message to clients
   */
  broadcast(message: Omit<WebSocketMessage, 'timestamp'>, options: {
    channel?: string
    excludeClientId?: string
    operatorId?: string
  } = {}) {
    const recipients = Array.from(this.clients.entries()).filter(([clientId, client]) => {
      // Exclude specific client
      if (options.excludeClientId && clientId === options.excludeClientId) {
        return false
      }

      // Filter by operator
      if (options.operatorId && client.operatorId !== options.operatorId) {
        return false
      }

      // Filter by channel subscription
      if (options.channel && !client.subscriptions.has(options.channel)) {
        return false
      }

      // Check connection is open
      return client.ws.readyState === client.ws.OPEN
    })

    recipients.forEach(([clientId]) => {
      this.sendToClient(clientId, message)
    })

    console.log(`📡 Broadcasted message "${message.type}" to ${recipients.length} clients`)
  }

  /**
   * Broadcast new message
   */
  broadcastNewMessage(message: any) {
    this.broadcast({
      type: 'new_message',
      data: message,
    }, {
      channel: `conversation:${message.conversationId}`,
    })
  }

  /**
   * Broadcast conversation update
   */
  broadcastConversationUpdate(conversation: any) {
    this.broadcast({
      type: 'conversation_updated',
      data: conversation,
    }, {
      channel: 'conversations',
    })
  }

  /**
   * Broadcast automation execution
   */
  broadcastAutomationExecution(execution: any) {
    this.broadcast({
      type: 'automation_executed',
      data: execution,
    }, {
      channel: 'automation',
    })
  }

  /**
   * Setup heartbeat for connection health
   */
  private setupHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          console.log(`💀 Removing dead client: ${clientId}`)
          client.ws.terminate()
          this.clients.delete(clientId)
          return
        }

        client.isAlive = false
        client.ws.ping()
      })
    }, 30000) // 30 seconds
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.clients.size
  }

  /**
   * Get client information
   */
  getClientInfo(): Array<{
    clientId: string
    operatorId: string
    subscriptions: string[]
    lastPing: number
    isAlive: boolean
  }> {
    return Array.from(this.clients.entries()).map(([clientId, client]) => ({
      clientId,
      operatorId: client.operatorId,
      subscriptions: Array.from(client.subscriptions),
      lastPing: client.lastPing,
      isAlive: client.isAlive,
    }))
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    console.log('🛑 Shutting down WebSocket server...')
    this.isShuttingDown = true

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.clients.forEach((client, clientId) => {
      client.ws.close(1013, 'Server shutting down')
    })

    this.clients.clear()

    if (this.wss) {
      this.wss.close()
      this.wss = null
    }

    console.log('✅ WebSocket server shut down complete')
  }
}

// Singleton instance
export const wsServer = new ChatWebSocketServer()