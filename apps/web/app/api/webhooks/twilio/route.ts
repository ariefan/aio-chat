import { NextRequest, NextResponse } from 'next/server'
import {
  getTwilioWhatsAppAdapter,
  TwilioWhatsAppAdapter,
  type TwilioWhatsAppMessage,
} from '@/lib/messaging/twilio-whatsapp-adapter'

/**
 * Twilio WhatsApp Webhook Handler
 *
 * Webhook URL: https://your-domain.com/api/webhooks/twilio
 *
 * Setup in Twilio Console:
 * 1. Go to Messaging > Try it out > Send a WhatsApp message
 * 2. Or go to your WhatsApp Sandbox settings
 * 3. Set "When a message comes in" to this webhook URL
 */

// Helper to parse form-urlencoded body
async function parseFormData(request: NextRequest): Promise<Record<string, string>> {
  const text = await request.text()
  const params = new URLSearchParams(text)
  const result: Record<string, string> = {}

  params.forEach((value, key) => {
    result[key] = value
  })

  return result
}

// POST - Handle incoming webhook from Twilio
export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-urlencoded data
    const contentType = request.headers.get('content-type') || ''

    let params: Record<string, string>

    if (contentType.includes('application/x-www-form-urlencoded')) {
      params = await parseFormData(request)
    } else if (contentType.includes('application/json')) {
      params = await request.json()
    } else {
      console.error('Unexpected content type:', contentType)
      return new NextResponse('Invalid content type', { status: 400 })
    }

    console.log('Twilio webhook received:', JSON.stringify(params, null, 2))

    // Validate this is a WhatsApp message (From starts with whatsapp:)
    if (!params.From?.startsWith('whatsapp:')) {
      console.log('Ignoring non-WhatsApp message:', params.From)
      return new NextResponse('OK', { status: 200 })
    }

    // Optional: Validate Twilio signature for security
    const twilioSignature = request.headers.get('x-twilio-signature')
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (twilioSignature && authToken) {
      const url = `${process.env.NEXTAUTH_URL || 'https://genai.technosmart.id'}/api/webhooks/twilio`
      const isValid = TwilioWhatsAppAdapter.validateSignature(
        twilioSignature,
        url,
        params,
        authToken
      )

      if (!isValid) {
        console.warn('Invalid Twilio signature - proceeding anyway for sandbox')
        // Don't block for sandbox testing, just warn
      }
    }

    // Get adapter and handle message
    const twilioAdapter = getTwilioWhatsAppAdapter()

    const message: TwilioWhatsAppMessage = {
      MessageSid: params.MessageSid || '',
      AccountSid: params.AccountSid || '',
      MessagingServiceSid: params.MessagingServiceSid,
      From: params.From || '',
      To: params.To || '',
      Body: params.Body || '',
      NumMedia: params.NumMedia || '0',
      MediaContentType0: params.MediaContentType0,
      MediaUrl0: params.MediaUrl0,
      ProfileName: params.ProfileName,
      WaId: params.WaId,
    }

    // Process the message (this sends the AI response)
    await twilioAdapter.handleIncomingMessage(message)

    // Return empty TwiML response (we send messages via API, not TwiML)
    // Twilio expects XML response
    const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    })

  } catch (error) {
    console.error('Twilio webhook error:', error)

    // Return empty TwiML to prevent Twilio from retrying
    const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  }
}

// GET - Health check / info endpoint
export async function GET(request: NextRequest) {
  const configured = {
    account_sid: !!process.env.TWILIO_ACCOUNT_SID,
    auth_token: !!process.env.TWILIO_AUTH_TOKEN,
    whatsapp_number: !!process.env.TWILIO_WHATSAPP_NUMBER,
  }

  return NextResponse.json({
    status: 'Twilio WhatsApp webhook endpoint is active',
    timestamp: new Date().toISOString(),
    configured,
    setup_instructions: {
      step1: 'Go to twilio.com/console > Messaging > Try it out > Send a WhatsApp message',
      step2: 'In the Sandbox settings, set "When a message comes in" webhook to this URL',
      step3: 'Send the join code from your phone to the Twilio sandbox number',
      step4: 'Test by sending a message to the sandbox number',
    },
    webhook_url: `${process.env.NEXTAUTH_URL || 'https://genai.technosmart.id'}/api/webhooks/twilio`,
  })
}
