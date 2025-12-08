import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as WebSocketServer } from 'ws'
import { initializeWebSocketServer } from './src/app/api/websocket/route.js'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3001

// Create the Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Create HTTP server
const server = createServer(async (req, res) => {
  try {
    const parsedUrl = parse(req.url, true)
    await handle(req, res, parsedUrl)
  } catch (err) {
    console.error('Error occurred handling', req.url, err)
    res.statusCode = 500
    res.end('internal server error')
  }
})

// Initialize WebSocket server
const wss = new WebSocketServer({ noServer: true })

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  const { pathname } = parse(request.url)

  if (pathname === '/api/websocket') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  } else {
    socket.destroy()
  }
})

// WebSocket connection handler
wss.on('connection', (ws, request) => {
  console.log('🔌 New WebSocket connection')

  // Parse URL to get token
  const { pathname, query } = parse(request.url, true)
  const token = query.token || (request.headers.authorization?.replace('Bearer ', ''))

  if (!token) {
    console.warn('🚫 WebSocket connection rejected: No token provided')
    ws.close(1008, 'No token provided')
    return
  }

  // Verify token (basic implementation)
  // In production, this should verify the JWT properly
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      console.log('📨 WebSocket message:', message.type)

      // Echo back for testing
      ws.send(JSON.stringify({
        type: 'echo',
        data: message,
        timestamp: new Date().toISOString(),
      }))
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error)
    }
  })

  ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket connection closed: ${code} - ${reason}`)
  })

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error)
  })

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      message: 'Connected to WebSocket server',
      serverTime: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  }))
})

// Start server
app.prepare().then(() => {
  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server listening on ws://${hostname}:${port}/api/websocket`)
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})