"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/protected-route'
import { CustomerPanel } from '@/components/simulation/customer-panel'
import { ChatInterface } from '@/components/simulation/chat-interface'
import { Combobox, ComboboxOption } from '@workspace/ui/src/components/combobox'
import { Button } from '@workspace/ui/src/components/button'
import { ArrowLeft, LayoutDashboard, Smartphone, RefreshCw } from 'lucide-react'
import { generateInitialReminder } from '@/lib/ai/simulation-ai'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface SimulationData {
  id: string
  pesertaProfile: {
    nokapst_masked: string
    bpjsId: string
    nik: string
    name: string
    status_kepesertaan: string
    kelas_rawat: string
    pekerjaan: string
    jumlah_tanggungan: number
    phone?: string | null
  }
  billingInfo: {
    total_tunggakan: number
    bulan_menunggak: string[]
    durasi_bulan: number
    last_payment_date: string
    last_payment_method: string
  }
  claimHistory: {
    last_claim: {
      date: string | null
      type: string | null
      diagnosis: string | null
      hospital: string | null
      claim_amount: number
    }
  }
  interactionHistory: {
    last_contact: {
      agent_name: string
      date: string
      channel: string
      outcome: string
      alasan_tunggak: string
    }
  }
  paymentCommitmentHistory: {
    credibility_score: number
    last_promise: {
      promised_date: string | null
      status: string
      days_overdue: number
    }
  }
  strategy: {
    approach: string
    urgency: string
    tone: string
  }
}

function SimulationPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMemberId = searchParams.get('memberId') || ''
  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialMemberId)
  const [memberData, setMemberData] = useState<SimulationData | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'dashboard' | 'customer'>('dashboard')

  // Member search
  const [memberOptions, setMemberOptions] = useState<ComboboxOption[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Fetch members for dropdown
  const fetchMembers = useCallback(async (search: string = '') => {
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/simulation/members?search=${encodeURIComponent(search)}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setMemberOptions(
          data.map((m: any) => ({
            value: m.id,
            label: m.name,
            sublabel: `${m.bpjsId} | Kelas ${m.memberClass}`,
          }))
        )
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    }
    setSearchLoading(false)
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Fetch member data when selected
  useEffect(() => {
    if (!selectedMemberId) {
      setMemberData(null)
      setMessages([])
      return
    }

    const fetchMemberData = async () => {
      try {
        const res = await fetch(`/api/simulation/members/${selectedMemberId}`)
        if (res.ok) {
          const data = await res.json()
          setMemberData(data)

          // Generate initial reminder message
          const initialMessage = generateInitialReminder(data)
          setMessages([{ role: 'assistant', content: initialMessage }])
        }
      } catch (error) {
        console.error('Failed to fetch member data:', error)
      }
    }

    fetchMemberData()
  }, [selectedMemberId])

  // Send message handler
  const handleSendMessage = async (text: string) => {
    if (!memberData) return

    // Add user message immediately
    const userMessage: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const res = await fetch('/api/simulation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          memberData,
          conversationHistory: messages,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const aiMessage: Message = { role: 'assistant', content: data.response }
        setMessages(prev => [...prev, aiMessage])
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Mohon maaf, terjadi gangguan sistem. Silakan coba lagi.',
        },
      ])
    }
    setIsLoading(false)
  }

  // Reset conversation
  const handleReset = () => {
    if (memberData) {
      const initialMessage = generateInitialReminder(memberData)
      setMessages([{ role: 'assistant', content: initialMessage }])
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-slate-100">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-4 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>

          <div className="flex-1 max-w-md">
            <Combobox
              options={memberOptions}
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
              placeholder="Pilih Peserta BPJS..."
              searchPlaceholder="Cari nama/BPJS ID..."
              loading={searchLoading}
              onSearch={fetchMembers}
            />
          </div>

          {selectedMemberId && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
                viewMode === 'dashboard'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <LayoutDashboard size={14} />
              Dashboard
            </button>
            <button
              onClick={() => setViewMode('customer')}
              className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-colors ${
                viewMode === 'customer'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Smartphone size={14} />
              Mobile
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'dashboard' ? (
            // Dashboard View (Split View)
            <div className="flex h-full">
              {/* Sidebar - Customer Panel */}
              <div className="w-80 min-w-[320px] max-w-[400px] h-full border-r border-slate-200 hidden md:block">
                <CustomerPanel data={memberData} />
              </div>

              {/* Main - Chat Interface */}
              <div className="flex-1 h-full">
                {selectedMemberId ? (
                  <ChatInterface
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50">
                    <div className="text-center text-slate-500">
                      <Smartphone size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Simulasi Penagihan PANDAWA</p>
                      <p className="text-sm mt-2">
                        Pilih peserta BPJS untuk memulai simulasi percakapan
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Mobile Simulation View
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                backgroundImage:
                  "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                backgroundRepeat: 'repeat',
              }}
            >
              <div className="w-full max-w-[380px] h-[90%] bg-white rounded-[30px] shadow-2xl overflow-hidden border-[8px] border-slate-800 flex flex-col relative">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20" />

                <div className="flex-1 overflow-hidden mt-2">
                  {selectedMemberId ? (
                    <ChatInterface
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      isLoading={isLoading}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-slate-50 p-4">
                      <div className="text-center text-slate-500">
                        <p className="text-sm">Pilih peserta untuk mulai</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Home Indicator */}
                <div className="h-6 bg-white flex justify-center items-center">
                  <div className="w-32 h-1 bg-slate-300 rounded-full" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default function SimulationPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-green-600" />
          <p className="mt-2 text-slate-600">Memuat simulasi...</p>
        </div>
      </div>
    }>
      <SimulationPageContent />
    </Suspense>
  )
}
