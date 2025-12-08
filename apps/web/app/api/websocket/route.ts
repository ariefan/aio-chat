import { NextRequest } from 'next/server'
import { WebSocketServer, WebSocket } from 'ws'
import { getToken } from 'next-auth/jwt'
import { wsServer } from '@/lib/websocket/server'

// Store the server instance to avoid multiple initializations
let wssInstance: WebSocketServer | null = null
let httpServer: any = null

/**
 * WebSocket API route handler
 */
export async function GET(request: NextRequest) {
  // This won't actually work for WebSocket upgrade in Next.js App Router
  // We need to use a different approach for Next.js 16

  return new Response('WebSocket endpoint', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  })
}

/**
 * WebSocket upgrade handler for Node.js server
 * This should be called from the custom server setup
 */
export async function handleWebSocketUpgrade(
  req: any,
  socket: any,
  head: Buffer
) {
  try {
    // Initialize WebSocket server if not already done
    if (!wssInstance) {
      wssInstance = new WebSocketServer({ noServer: true })
      wsServer.initialize({ wss: wssInstance } as any)
    }

    // Handle the upgrade
    wssInstance.handleUpgrade(req, socket, head, (ws) => {
      wssInstance!.emit('connection', ws, req)
    })
  } catch (error) {
    console.error('❌ WebSocket upgrade failed:', error)
    socket.destroy()
  }
}

/**
 * Initialize WebSocket server with HTTP server
 * This should be called in your custom server setup
 */
export function initializeWebSocketServer(server: any) {
  if (httpServer) {
    console.warn('⚠️ WebSocket server already initialized')
    return
  }

  httpServer = server

  // Create WebSocket server
  wssInstance = new WebSocketServer({
    server,
    path: '/api/websocket',
    verifyClient: wsServer['verifyClient'].bind(wsServer)
  })

  // Set up event handlers
  wssInstance.on('connection', wsServer['handleConnection'].bind(wsServer))
  wssInstance.on('error', wsServer['handleError'].bind(wsServer))
  wssInstance.on('close', wsServer['handleClose'].bind(wsServer))

  console.log('🔌 WebSocket server initialized')

  // Handle server shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down WebSocket server')
    wsServer.shutdown()
  })

  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down WebSocket server')
    wsServer.shutdown()
  })
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wssInstance
}