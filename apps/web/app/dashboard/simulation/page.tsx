"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/protected-route'
import { CustomerPanel } from '@/components/simulation/customer-panel'
import { ChatInterface } from '@/components/simulation/chat-interface'
import { Button } from '@workspace/ui/src/components/button'
import { Badge } from '@workspace/ui/src/components/badge'
import {
  ArrowLeft,
  LayoutDashboard,
  Smartphone,
  RefreshCw,
  Search,
  User,
  AlertTriangle,
  CreditCard,
} from 'lucide-react'
import { generateInitialReminder } from '@/lib/ai/simulation-ai'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface MemberListItem {
  id: string
  bpjsId: string
  name: string
  memberClass: string
  status: string
  totalArrears?: number
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

  // Member list state
  const [members, setMembers] = useState<MemberListItem[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch members for list
  const fetchMembers = useCallback(async (search: string = '') => {
    setMembersLoading(true)
    try {
      const res = await fetch(`/api/simulation/members?search=${encodeURIComponent(search)}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setMembers(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    }
    setMembersLoading(false)
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, fetchMembers])

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
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

          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-800">Simulasi Penagihan PANDAWA</h1>
            <p className="text-xs text-slate-500">Simulasi percakapan penagihan iuran BPJS</p>
          </div>

          {selectedMemberId && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Chat
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
        <div className="flex-1 overflow-hidden flex">
          {/* Left Sidebar - Member List */}
          <div className="w-80 min-w-[320px] max-w-[400px] bg-white border-r flex flex-col">
            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau No. BPJS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Member List */}
            <div className="flex-1 overflow-y-auto">
              {membersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Tidak ada peserta ditemukan</p>
                </div>
              ) : (
                <div className="divide-y">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedMemberId === member.id
                          ? 'bg-green-50 border-l-4 border-green-500'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.bpjsId}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0">
                              Kelas {member.memberClass}
                            </Badge>
                            {member.status === 'inactive' && (
                              <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">
                                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                                Nonaktif
                              </Badge>
                            )}
                          </div>
                          {member.totalArrears && member.totalArrears > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-red-600">
                              <CreditCard className="h-3 w-3" />
                              {formatCurrency(member.totalArrears)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="p-3 border-t bg-slate-50 text-xs text-slate-500">
              Total: {members.length} peserta
            </div>
          </div>

          {/* Right Content */}
          {viewMode === 'dashboard' ? (
            // Dashboard View (Customer Panel + Chat)
            <div className="flex-1 flex h-full">
              {/* Customer Panel */}
              <div className="w-80 min-w-[320px] max-w-[400px] h-full border-r border-slate-200 hidden lg:block">
                <CustomerPanel data={memberData} />
              </div>

              {/* Chat Interface */}
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
                        Pilih peserta BPJS dari daftar untuk memulai simulasi
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Mobile Simulation View
            <div
              className="flex-1 flex items-center justify-center"
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
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-100">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-green-600" />
            <p className="mt-2 text-slate-600">Memuat simulasi...</p>
          </div>
        </div>
      }
    >
      <SimulationPageContent />
    </Suspense>
  )
}
