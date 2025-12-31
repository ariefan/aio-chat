import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  getWhatsAppAdapter,
  type WhatsAppWebhookPayload,
} from '@/lib/messaging/whatsapp-adapter'
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  rateLimitExceededResponse,
} from '@/lib/rate-limiter'

/**
 * WhatsApp Cloud API Webhook Handler
 *
 * Webhook URL: https://your-domain.com/api/webhooks/whatsapp
 *
 * Setup in Meta Developer Console:
 * 1. Go to your App > WhatsApp > Configuration
 * 2. Set Webhook URL to this endpoint
 * 3. Set Verify Token to match WHATSAPP_VERIFY_TOKEN env var
 * 4. Subscribe to: messages, message_deliveries, message_reads
 */

// Verify webhook signature from Meta
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature) return false

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex')

  return `sha256=${expectedSignature}` === signature
}

// POST - Handle incoming webhook events
export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request)
  const rateCheck = checkRateLimit(clientId, RATE_LIMITS.webhook)
  if (!rateCheck.allowed) {
    return rateLimitExceededResponse(rateCheck.retryAfter!)
  }

  try {
    const rawBody = await request.text()

    // Verify signature if app secret is configured
    const appSecret = process.env.WHATSAPP_APP_SECRET
    if (appSecret) {
      const signature = request.headers.get('x-hub-signature-256')
      if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
        console.error('Invalid WhatsApp webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    // Parse the payload
    let payload: WhatsAppWebhookPayload
    try {
      payload = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('Failed to parse WhatsApp webhook:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    // Validate it's a WhatsApp Business Account webhook
    if (payload.object !== 'whatsapp_business_account') {
      console.log('Ignoring non-WhatsApp webhook:', payload.object)
      return NextResponse.json({ status: 'ignored' })
    }

    console.log('WhatsApp webhook received:', JSON.stringify(payload, null, 2))

    const whatsappAdapter = getWhatsAppAdapter()

    // Process each entry
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue

        const value = change.value

        // Handle incoming messages
        if (value.messages && value.contacts) {
          for (const message of value.messages) {
            const contact = value.contacts.find(c => c.wa_id === message.from)
            if (contact) {
              await whatsappAdapter.handleIncomingMessage(message, contact)
            }
          }
        }

        // Handle status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            await whatsappAdapter.handleStatusUpdate(status)
          }
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json({ status: 'error', message: 'Internal error' })
  }
}

// GET - Webhook verification (required by Meta)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Meta sends these params for verification
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Check if this is a verification request
  if (mode === 'subscribe' && token && challenge) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

    if (!verifyToken) {
      console.error('WHATSAPP_VERIFY_TOKEN not configured')
      return NextResponse.json(
        { error: 'Server not configured for webhook verification' },
        { status: 500 }
      )
    }

    if (token === verifyToken) {
      console.log('WhatsApp webhook verified successfully')
      // Return the challenge as plain text (required by Meta)
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    } else {
      console.error('WhatsApp webhook verification failed: token mismatch')
      return NextResponse.json(
        { error: 'Verification token mismatch' },
        { status: 403 }
      )
    }
  }

  // Health check / info endpoint
  return NextResponse.json({
    status: 'WhatsApp webhook endpoint is active',
    timestamp: new Date().toISOString(),
    configured: {
      phone_number_id: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      access_token: !!process.env.WHATSAPP_ACCESS_TOKEN,
      verify_token: !!process.env.WHATSAPP_VERIFY_TOKEN,
      app_secret: !!process.env.WHATSAPP_APP_SECRET,
    },
    setup_instructions: {
      step1: 'Go to developers.facebook.com > Your App > WhatsApp > Configuration',
      step2: 'Set Webhook URL to: https://your-domain.com/api/webhooks/whatsapp',
      step3: 'Set Verify Token to match your WHATSAPP_VERIFY_TOKEN env variable',
      step4: 'Subscribe to webhook fields: messages',
      step5: 'Test by sending a message to your WhatsApp Business number',
    },
  })
}
