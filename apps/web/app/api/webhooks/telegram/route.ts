import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getTelegramAdapter } from '@/lib/messaging/telegram-adapter'

// Telegram doesn't provide webhook signature verification like WhatsApp
// So we'll rely on the Telegram Bot API security model
export async function POST(request: NextRequest) {
  try {
    // Verify content type
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      )
    }

    // Get the raw body for logging
    const body = await request.text()
    console.log('Telegram webhook received:', body)

    // Parse the JSON body
    let update
    try {
      update = JSON.parse(body)
    } catch (parseError) {
      console.error('Failed to parse webhook body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    // Basic validation of Telegram webhook update
    if (!update || typeof update !== 'object') {
      return NextResponse.json(
        { error: 'Invalid webhook format' },
        { status: 400 }
      )
    }

    const telegramAdapter = getTelegramAdapter()

    // Handle different types of updates
    if (update.message) {
      // Handle incoming message
      await telegramAdapter.handleIncomingMessage(update.message)
    } else if (update.callback_query) {
      // Handle callback query (button clicks)
      console.log('Received callback query:', update.callback_query)
      // TODO: Implement callback query handling
    } else if (update.inline_query) {
      // Handle inline query
      console.log('Received inline query:', update.inline_query)
      // TODO: Implement inline query handling
    } else if (update.channel_post) {
      // Handle channel post (if bot is added to a channel)
      console.log('Received channel post:', update.channel_post)
      // TODO: Implement channel post handling
    } else {
      // Log unknown update types
      console.log('Received unknown update type:', update)
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle webhook setup verification (Telegram uses a different method)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Telegram webhook setup verification
  if (searchParams.get('set_webhook')) {
    try {
      const telegramAdapter = getTelegramAdapter()
      const botInfo = await telegramAdapter.getBotInfo()

      const webhookUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/telegram`

      // This would normally be done via Telegram Bot API directly
      // For development, we'll provide setup instructions
      return NextResponse.json({
        bot: botInfo,
        webhook_url: webhookUrl,
        setup_instructions: {
          step1: `Set webhook via: https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`,
          step2: 'Verify webhook is set correctly',
          step3: 'Test by sending a message to your bot',
          note: 'Make sure your server is accessible from the internet (use ngrok for local development)'
        }
      })
    } catch (error) {
      console.error('Failed to get bot info:', error)
      return NextResponse.json(
        { error: 'Failed to get bot information' },
        { status: 500 }
      )
    }
  }

  // Health check endpoint
  return NextResponse.json({
    status: 'Telegram webhook endpoint is active',
    timestamp: new Date().toISOString(),
    bot_token_configured: !!process.env.TELEGRAM_BOT_TOKEN
  })
}