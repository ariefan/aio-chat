'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription, Badge } from '@workspace/ui'
import { MessageCircle, Send, Settings, Bot, User, CheckCircle, AlertCircle } from 'lucide-react'

export default function TelegramPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [telegramToken, setTelegramToken] = useState('')
  const [testChatId, setTestChatId] = useState('')
  const [testMessage, setTestMessage] = useState('Hello from AIO-CHAT! 🤖')
  const [isLoading, setIsLoading] = useState(false)
  const [setupStatus, setSetupStatus] = useState<any>(null)
  const [sendStatus, setSendStatus] = useState<string>('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Load Telegram setup status
    checkTelegramSetup()
  }, [session, status, router])

  const checkTelegramSetup = async () => {
    try {
      const response = await fetch('/api/telegram/setup')
      const data = await response.json()
      setSetupStatus(data)
    } catch (error) {
      console.error('Failed to check Telegram setup:', error)
    }
  }

  const handleSetupWebhook = async () => {
    if (!telegramToken) {
      alert('Please enter your Telegram Bot Token')
      return
    }

    setIsLoading(true)
    try {
      // Temporarily set the token for testing
      const response = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: `${window.location.origin}/api/webhooks/telegram`
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('Telegram setup instructions generated! Check the console for details.')
        console.log('Telegram Setup Instructions:', data.instructions)
        console.log('Set Webhook Command:', data.webhookSetup.setWebhookCommand)
      } else {
        alert('Failed to setup Telegram: ' + data.error)
      }
    } catch (error) {
      console.error('Setup error:', error)
      alert('Failed to setup Telegram. Check console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!testChatId || !testMessage) {
      alert('Please enter Chat ID and Message')
      return
    }

    setIsLoading(true)
    setSendStatus('')

    try {
      const response = await fetch('/api/webhooks/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: testChatId,
          text: testMessage
        })
      })

      if (response.ok) {
        setSendStatus('✅ Message sent successfully!')
      } else {
        const error = await response.text()
        setSendStatus(`❌ Failed to send: ${error}`)
      }
    } catch (error) {
      console.error('Send error:', error)
      setSendStatus('❌ Failed to send message. Check console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBot = () => {
    window.open('https://t.me/botfather', '_blank')
  }

  const handleGetChatId = () => {
    alert('To get your Chat ID:\n1. Send a message to @RawDataBot\n2. It will reply with your chat ID\n3. Copy that ID into the Chat ID field')
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Telegram Bot Setup
          </h1>
          <p className="text-gray-600">
            Configure and test your Telegram bot integration for AIO-CHAT
          </p>
        </div>

        {setupStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Bot Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={setupStatus.bot ? "default" : "destructive"}>
                      {setupStatus.bot ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
                  {setupStatus.bot && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Bot Name:</span>
                        <span className="text-sm">{setupStatus.bot.first_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Username:</span>
                        <span className="text-sm">@{setupStatus.bot.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Bot ID:</span>
                        <span className="text-sm">{setupStatus.bot.id}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Webhook Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Webhook URL:</span>
                    <Badge variant="outline" className="text-xs">
                      {setupStatus.webhookUrl}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Environment:</span>
                    <Badge variant="outline">
                      {setupStatus.environment}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Setup</CardTitle>
              <CardDescription>
                Get your Telegram bot configured in minutes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">1. Create Telegram Bot</label>
                  <Button
                    onClick={handleCreateBot}
                    variant="outline"
                    className="w-full"
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Open BotFather
                  </Button>
                  <p className="text-xs text-gray-600">
                    Create a new bot with @BotFather on Telegram
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">2. Get Your Chat ID</label>
                  <Button
                    onClick={handleGetChatId}
                    variant="outline"
                    className="w-full"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Get Chat ID
                  </Button>
                  <p className="text-xs text-gray-600">
                    Send a message to @RawDataBot to get your ID
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Messaging</CardTitle>
              <CardDescription>
                Send a test message to your Telegram bot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your Telegram Chat ID
                  </label>
                  <Input
                    placeholder="123456789"
                    value={testChatId}
                    onChange={(e) => setTestChatId(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Test Message
                  </label>
                  <textarea
                    className="w-full p-3 border rounded-md text-sm"
                    rows={3}
                    placeholder="Hello from AIO-CHAT! 🤖"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isLoading ? 'Sending...' : 'Send Message'}
                </Button>

                {sendStatus && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{sendStatus}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Setup</CardTitle>
              <CardDescription>
                Configure your bot's webhook URL to receive messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-md">
                <h4 className="font-medium mb-2">Setup Instructions:</h4>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Copy your bot token from @BotFather</li>
                  <li>Run this curl command to set the webhook:</li>
                </ol>
                <div className="mt-2 p-2 bg-gray-800 text-white text-xs rounded overflow-x-auto">
                  <code>curl -X POST "https://api.telegram.org/bot&lt;YOUR_TOKEN&gt;/setWebhook?url={setupStatus?.webhookUrl || 'YOUR_WEBHOOK_URL'}"</code>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Use ngrok for local development: ngrok http 3000
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}