"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui'
import { Button } from '@workspace/ui/src/components/button'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Save, RefreshCw, Bot, MessageSquare } from 'lucide-react'

interface SettingsData {
  [key: string]: {
    value: string
    description: string | null
    category: string | null
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings?category=ai')
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings || {})
        // Initialize edited values
        const initialEdited: Record<string, string> = {}
        for (const [key, setting] of Object.entries(data.settings || {}) as [string, { value: string }][]) {
          initialEdited[key] = setting.value
        }
        setEditedValues(initialEdited)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (key: string) => {
    setSaving(key)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          value: editedValues[key],
          category: 'ai',
        }),
      })

      if (res.ok) {
        // Update local state
        setSettings(prev => {
          const prevSetting = prev[key]
          return {
            ...prev,
            [key]: {
              value: editedValues[key] || '',
              description: prevSetting?.description ?? null,
              category: prevSetting?.category ?? null,
            },
          }
        })
      }
    } catch (error) {
      console.error('Failed to save setting:', error)
    }
    setSaving(null)
  }

  const hasChanges = (key: string) => {
    return settings[key]?.value !== editedValues[key]
  }

  const promptSettings = [
    {
      key: 'ai.jenny.system_prompt',
      title: 'RICH AI System Prompt',
      description: 'System prompt untuk RICH chatbot yang melayani peserta BPJS via Telegram/WhatsApp',
      icon: Bot,
    },
    {
      key: 'ai.simulation.system_prompt',
      title: 'Simulation AI System Prompt',
      description: 'System prompt untuk simulasi penagihan RICH',
      icon: MessageSquare,
    },
  ]

  return (
    <DashboardLayout
      title="Pengaturan"
      subtitle="Konfigurasi sistem dan AI"
      onRefresh={fetchSettings}
      loading={loading}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Prompts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              promptSettings.map((prompt) => (
                <div key={prompt.key} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        <prompt.icon className="h-4 w-4" />
                        {prompt.title}
                      </h3>
                      <p className="text-sm text-gray-500">{prompt.description}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSave(prompt.key)}
                      disabled={!hasChanges(prompt.key) || saving === prompt.key}
                    >
                      {saving === prompt.key ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Simpan
                    </Button>
                  </div>
                  <textarea
                    value={editedValues[prompt.key] || ''}
                    onChange={(e) => setEditedValues(prev => ({
                      ...prev,
                      [prompt.key]: e.target.value,
                    }))}
                    className="w-full h-64 p-3 border rounded-lg font-mono text-sm resize-y"
                    placeholder="Enter system prompt..."
                  />
                  {hasChanges(prompt.key) && (
                    <p className="text-xs text-yellow-600">
                      * Ada perubahan yang belum disimpan
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informasi AI Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Provider</p>
                <p className="font-medium">{process.env.NEXT_PUBLIC_AI_PROVIDER || 'OpenRouter'}</p>
              </div>
              <div>
                <p className="text-gray-500">Model</p>
                <p className="font-medium">{process.env.NEXT_PUBLIC_AI_MODEL || 'Default'}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              AI provider dan model dikonfigurasi melalui environment variables.
              Hubungi administrator untuk mengubah konfigurasi ini.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
