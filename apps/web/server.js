import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { wsServer } from './src/lib/websocket/server.js'

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

// Start server
app.prepare().then(() => {
  // Initialize WebSocket server with HTTP server
  wsServer.initialize(server)

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server listening on ws://${hostname}:${port}/api/websocket`)
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received')
  wsServer.shutdown()
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received')
  wsServer.shutdown()
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})
