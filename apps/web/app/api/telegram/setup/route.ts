import { NextRequest, NextResponse } from 'next/server'
import { getTelegramAdapter } from '@/lib/messaging/telegram-adapter'

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl } = await request.json()

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'webhookUrl is required' },
        { status: 400 }
      )
    }

    const telegramAdapter = getTelegramAdapter()

    // Test the connection by getting bot info
    const botInfo = await telegramAdapter.getBotInfo()

    // In a real implementation, you would set the webhook here:
    // await telegramAdapter.setWebhook(webhookUrl)

    // For now, we'll provide the setup instructions
    const setWebhookUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`

    return NextResponse.json({
      success: true,
      botInfo: {
        id: botInfo.id,
        username: botInfo.username,
        first_name: botInfo.first_name,
        is_bot: botInfo.is_bot,
      },
      webhookSetup: {
        url: webhookUrl,
        setWebhookCommand: setWebhookUrl,
        deleteWebhookCommand: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/deleteWebhook`,
        getWebhookInfoCommand: `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`,
      },
      instructions: {
        step1: '1. Run this command in your terminal to set the webhook:',
        step2: `   curl -X POST "${setWebhookUrl}"`,
        step3: '2. Verify the webhook is set:',
        step4: `   curl "https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getWebhookInfo"`,
        step5: '3. Test by sending a message to your bot',
        note: 'For local development, use ngrok: ngrok http 3000',
      },
    })

  } catch (error) {
    console.error('Telegram setup error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to setup Telegram webhook', details: errorMessage },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const telegramAdapter = getTelegramAdapter()
    const botInfo = await telegramAdapter.getBotInfo()

    return NextResponse.json({
      bot: botInfo,
      webhookConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
      environment: process.env.NODE_ENV,
      serverUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      webhookUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhooks/telegram`,
    })

  } catch (error) {
    console.error('Failed to get Telegram bot info:', error)
    return NextResponse.json(
      { error: 'Failed to get bot information' },
      { status: 500 }
    )
  }
}