"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui'
import { Button } from '@workspace/ui/src/components/button'
import { DashboardLayout } from '@/components/dashboard/layout'
import { Save, RefreshCw, Bot, MessageSquare, Sparkles, Database, AlertTriangle, BookOpen } from 'lucide-react'
import { Combobox, ComboboxOption } from '@workspace/ui'

// Top 10 LLM Models for POC Chatbot
const AI_MODEL_OPTIONS: ComboboxOption[] = [
  // Tier 1: Budget-Friendly Speed Demons
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    sublabel: 'OpenAI - Best balance of speed & cost ($0.15/$0.60 per 1M)'
  },
  {
    value: 'gemini-2.0-flash-exp',
    label: 'Gemini 2.0 Flash Experimental',
    sublabel: 'Google - FREE tier, blazing fast'
  },
  {
    value: 'claude-3-5-haiku-20241022',
    label: 'Claude 3.5 Haiku',
    sublabel: 'Anthropic - Fast & affordable (~$0.25/$1.25 per 1M)'
  },
  {
    value: 'deepseek-chat',
    label: 'DeepSeek Chat',
    sublabel: 'DeepSeek - Cheapest option (~$0.14/$0.28 per 1M)'
  },

  // Tier 2: Smart Mid-Range
  {
    value: 'gpt-4o',
    label: 'GPT-4o',
    sublabel: 'OpenAI - Excellent balance ($2.50/$10 per 1M)'
  },
  {
    value: 'claude-3-5-sonnet-20241022',
    label: 'Claude 3.5 Sonnet',
    sublabel: 'Anthropic - Great reasoning ($3/$15 per 1M)'
  },
  {
    value: 'gemini-2.5-pro-preview-03-25',
    label: 'Gemini 2.5 Pro',
    sublabel: 'Google - Strong reasoning capabilities'
  },

  // Tier 3: Heavy Artillery
  {
    value: 'claude-3-opus-20240229',
    label: 'Claude 3 Opus',
    sublabel: 'Anthropic - Maximum intelligence ($15/$75 per 1M)'
  },
  {
    value: 'o1-preview',
    label: 'GPT-1 Preview',
    sublabel: 'OpenAI - Deep reasoning for complex tasks ($15/$60 per 1M)'
  },
  {
    value: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    sublabel: 'Google - Balanced performance'
  },
]

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
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini')

  // Seed states
  const [seeding, setSeeding] = useState<string | null>(null)
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string; data?: any } | null>(null)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings || {})
        // Initialize edited values
        const initialEdited: Record<string, string> = {}
        for (const [key, setting] of Object.entries(data.settings || {}) as [string, { value: string }][]) {
          initialEdited[key] = setting.value
          // Set selected model from database
          if (key === 'ai.model') {
            setSelectedModel(setting.value)
          }
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

  const handleModelChange = async (model: string) => {
    setSelectedModel(model)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'ai.model',
          value: model,
          description: 'Selected AI model for chatbot',
          category: 'ai',
        }),
      })

      if (res.ok) {
        setSettings(prev => ({
          ...prev,
          'ai.model': {
            value: model,
            description: 'Selected AI model for chatbot',
            category: 'ai',
          },
        }))
      }
    } catch (error) {
      console.error('Failed to save model:', error)
    }
  }

  const handleSeed = async (type: 'bpjs' | 'admin' | 'knowledge') => {
    setSeeding(type)
    setSeedResult(null)

    try {
      const endpoint = type === 'bpjs'
        ? '/api/bpjs/seed'
        : type === 'knowledge'
        ? '/api/knowledge/seed'
        : '/api/admin/seed'
      const res = await fetch(endpoint, { method: 'POST' })

      const result = await res.json()
      setSeedResult(result)

      if (res.ok) {
        console.log(`✅ ${type} seeding successful:`, result)
      } else {
        console.error(`❌ ${type} seeding failed:`, result)
      }
    } catch (error) {
      console.error(`Failed to seed ${type}:`, error)
      setSeedResult({
        success: false,
        message: `Failed to seed ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }

    setSeeding(null)
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
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Informasi AI Provider
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Provider</p>
                <p className="text-sm text-gray-600">{process.env.NEXT_PUBLIC_AI_PROVIDER || 'OpenAI'}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Model AI</p>
                <Combobox
                  options={AI_MODEL_OPTIONS}
                  value={selectedModel}
                  onValueChange={handleModelChange}
                  placeholder="Pilih model AI..."
                  searchPlaceholder="Cari model..."
                  className="w-full"
                />
                <p className="mt-2 text-xs text-gray-500">
                  💡 Pilih model untuk chatbot. <strong>GPT-4o Mini</strong> direkomendasikan untuk POC.
                </p>
              </div>
            </div>

            <div className="rounded-md bg-blue-50 p-3 border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Info:</strong> Konfigurasi ini akan disimpan ke database dan menggantikan environment variable untuk model selection.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Seed Data (Testing)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">Perhatian!</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Fitur ini akan menambahkan data testing ke database. Gunakan hanya untuk development/testing.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* BPJS Seed */}
              <div className="p-4 border rounded-lg space-y-3">
                <div>
                  <h4 className="font-medium text-sm">Seed BPJS Test Data</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Membuat 10 member BPJS dummy dengan tunggakan untuk testing scheduler
                  </p>
                </div>
                <div className="text-xs space-y-1 text-gray-600 bg-gray-50 p-3 rounded">
                  <p>• <strong>3 members</strong>: Jatuh tempo dalam 7 hari (reminder_7d)</p>
                  <p>• <strong>3 members</strong>: Jatuh tempo dalam 3 hari (reminder_3d)</p>
                  <p>• <strong>2 members</strong>: Jatuh tempo dalam 1 hari (reminder_1d)</p>
                  <p>• <strong>2 members</strong>: Sudah overdue (overdue reminder)</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSeed('bpjs')}
                  disabled={seeding === 'bpjs'}
                  className="w-full"
                >
                  {seeding === 'bpjs' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Seeding...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Seed BPJS Data
                    </>
                  )}
                </Button>
              </div>

              {/* Admin Seed */}
              <div className="p-4 border rounded-lg space-y-3">
                <div>
                  <h4 className="font-medium text-sm">Seed Admin & Users Data</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Membuat operators, users, conversations, messages, dan templates
                  </p>
                </div>
                <div className="text-xs space-y-1 text-gray-600 bg-gray-50 p-3 rounded">
                  <p>• <strong>2 operators</strong>: Admin & Operator</p>
                  <p>• <strong>3 users</strong>: 2 WhatsApp, 1 Telegram</p>
                  <p>• <strong>3 conversations</strong> dengan berbagai status</p>
                  <p>• <strong>4 messages</strong> sample</p>
                  <p>• <strong>3 templates</strong> pesan</p>
                </div>
                <div className="rounded-md bg-red-50 p-2 border border-red-200">
                  <p className="text-xs text-red-700">
                    <strong>⚠️ WARNING:</strong> Ini akan MENGHAPUS semua data existing sebelum seeding!
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleSeed('admin')}
                  disabled={seeding === 'admin'}
                  className="w-full"
                >
                  {seeding === 'admin' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Seeding...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Seed Admin Data
                    </>
                  )}
                </Button>
              </div>

              {/* BPJS Knowledge Base Seed */}
              <div className="p-4 border rounded-lg space-y-3">
                <div>
                  <h4 className="font-medium text-sm">Seed BPJS Knowledge Base</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Migrasi 33 entry BPJS dari constants.ts (Pembayaran, Autodebet, REHAB, dll)
                  </p>
                </div>
                <div className="text-xs space-y-1 text-gray-600 bg-gray-50 p-3 rounded">
                  <p>• <strong>10 entries</strong>: BPJS-specific knowledge base</p>
                  <p>• <strong>6 categories</strong>: Pembayaran, Autodebet, Kepesertaan, REHAB, Mobile JKN, Kebijakan</p>
                  <p>• <strong>Persona-based</strong>: Adaptive untuk setiap persona PANDAWA</p>
                  <p>• <strong>FAQs included</strong>: Jawaban untuk pertanyaan umum</p>
                </div>
                <div className="rounded-md bg-blue-50 p-2 border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>ℹ️ INFO:</strong> Ini akan MENGHAPUS semua KB entries existing dan mengganti dengan BPJS KB.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSeed('knowledge')}
                  disabled={seeding === 'knowledge'}
                  className="w-full"
                >
                  {seeding === 'knowledge' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Seeding...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Seed BPJS Knowledge Base
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Result Display */}
            {seedResult && (
              <div className={`p-4 rounded-lg border ${
                seedResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm font-medium ${
                  seedResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {seedResult.success ? '✅' : '❌'} {seedResult.message}
                </p>
                {seedResult.data && (
                  <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
                    {JSON.stringify(seedResult.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
