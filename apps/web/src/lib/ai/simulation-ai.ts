/**
 * RICH AI Service for Debt Collection Simulation
 * Uses existing OpenRouter/TogetherAI integration
 */

export interface SimulationMemberData {
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

export interface SimulationMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type AIProvider = 'openrouter' | 'togetherai'

interface AIProviderConfig {
  baseUrl: string
  model: string
  apiKey: string
  headers: Record<string, string>
}

function getAIConfig(): AIProviderConfig {
  const provider = (process.env.AI_PROVIDER || 'openrouter') as AIProvider
  const apiKey = process.env.AI_API_KEY || ''

  if (provider === 'togetherai') {
    return {
      baseUrl: 'https://api.together.xyz/v1',
      model: process.env.AI_MODEL || 'google/gemma-2-9b-it',
      apiKey,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  }

  // Default: OpenRouter
  return {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: process.env.AI_MODEL || 'google/gemma-3-4b-it',
    apiKey,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'RICH Simulation',
    },
  }
}

function buildSystemPrompt(data: SimulationMemberData): string {
  const nomorKartuAkhiran = data.pesertaProfile.nokapst_masked.slice(-4)

  return `
Anda adalah RICH (Research Insight Circle Hub), asisten virtual resmi BPJS Kesehatan.

=========== STATUS & KONTEKS SAAT INI ===========
Status No. WA User: TERDAFTAR (di DB SIKAT)
Skenario: Anda sedang menghubungi peserta untuk mengingatkan tunggakan (Reminder Flow).
Namun, Anda JUGA harus siap menjawab pertanyaan teknis (CS Flow).

=========== DATA PERSONAL PESERTA ===========
Profil:
- Nama: ${data.pesertaProfile.name}
- No. Kartu: ${data.pesertaProfile.nokapst_masked}
- Status: ${data.pesertaProfile.status_kepesertaan} (Kelas ${data.pesertaProfile.kelas_rawat})
- Pekerjaan: ${data.pesertaProfile.pekerjaan}
- Tanggungan: ${data.pesertaProfile.jumlah_tanggungan} jiwa

Tagihan:
- Total Tunggakan: Rp${data.billingInfo.total_tunggakan.toLocaleString('id-ID')}
- Periode: ${data.billingInfo.bulan_menunggak.join(', ')}
- Durasi: ${data.billingInfo.durasi_bulan} bulan
- Pembayaran Terakhir: ${data.billingInfo.last_payment_date}

${data.claimHistory.last_claim.hospital ? `
Klaim Terakhir (LEVERAGE):
- RS: ${data.claimHistory.last_claim.hospital}
- Diagnosis: ${data.claimHistory.last_claim.diagnosis}
- Biaya Ditanggung BPJS: Rp${data.claimHistory.last_claim.claim_amount?.toLocaleString('id-ID') || 0}
- Tanggal: ${data.claimHistory.last_claim.date}
` : ''}

Riwayat Komitmen:
- Skor Kredibilitas: ${Math.round(data.paymentCommitmentHistory.credibility_score * 100)}%
- Status Janji Terakhir: ${data.paymentCommitmentHistory.last_promise.status}
${data.paymentCommitmentHistory.last_promise.days_overdue > 0 ? `- Lewat ${data.paymentCommitmentHistory.last_promise.days_overdue} hari` : ''}

Strategi Penagihan: ${data.strategy.approach}
Tone: ${data.strategy.tone}
Urgency: ${data.strategy.urgency}

=========== ALUR PERCAKAPAN ===========

1. **FLOW AWAL (REMINDER)**:
   - Mulai dengan salam dan pengingat tunggakan yang sopan
   - Sebutkan nama peserta (panggil Bapak/Ibu)
   - Infokan jumlah tunggakan dan periode

2. **FLOW JAWABAN PERTANYAAN**:
   - Jika user bertanya cara bayar, cicilan, autodebet:
   - JAWAB dengan informatif
   - Arahkan ke Mobile JKN atau bank/channel pembayaran
   - Setelah jawab, kembali ingatkan untuk melunasi

3. **FLOW PERSUASI (LEVERAGE)**:
   - Jika user menolak atau alasan tidak bayar:
   - Gunakan data klaim terakhir sebagai pengingat manfaat
   - Contoh: "Bu, bulan lalu Ibu dirawat di ${data.claimHistory.last_claim.hospital || 'RS'} habis Rp${data.claimHistory.last_claim.claim_amount?.toLocaleString('id-ID') || '0'} ditanggung BPJS. Sayang kalau kartu nonaktif."

4. **GAYA BICARA**:
   - Bahasa Indonesia yang sopan dan luwes
   - Panggil Bapak/Ibu
   - Empati tapi tetap fokus pada solusi pembayaran
   - Jangan terlalu panjang, langsung ke poin

5. **INFORMASI PEMBAYARAN**:
   - Virtual Account BRI/BNI/Mandiri/BSI via ATM/Mobile Banking
   - Tokopedia, Shopee, Bukalapak, Alfamart, Indomaret
   - Autodebet: Daftar via Mobile JKN
   - Cicilan REHAB: 3/6/12 bulan via kantor BPJS

Jika user menyapa, jawab: "Selamat [Pagi/Siang], RICH di sini. Ada yang dapat kami bantu terkait kepesertaan BPJS Kesehatan Bapak/Ibu?"
Jika verifikasi: "Benar dengan pemilik kartu akhiran **${nomorKartuAkhiran}**?"
`
}

export async function generateSimulationResponse(
  userMessage: string,
  memberData: SimulationMemberData,
  conversationHistory: SimulationMessage[]
): Promise<{ response: string; model: string }> {
  const config = getAIConfig()

  if (!config.apiKey) {
    return {
      response: 'Mohon maaf, sistem AI belum dikonfigurasi. Silakan hubungi administrator.',
      model: 'fallback',
    }
  }

  const systemPrompt = buildSystemPrompt(memberData)

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.filter(m => m.role !== 'system'),
    { role: 'user', content: userMessage },
  ]

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.3,
        max_tokens: 800,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI API Error:', response.status, errorText)
      throw new Error(`AI API Error: ${response.status}`)
    }

    const data = await response.json()
    const assistantMessage = data.choices?.[0]?.message?.content ||
      'Mohon maaf, tidak dapat memproses permintaan saat ini.'

    return {
      response: assistantMessage,
      model: config.model,
    }
  } catch (error) {
    console.error('Simulation AI Error:', error)
    return {
      response: 'Mohon maaf, sistem sedang mengalami gangguan teknis. Silakan coba beberapa saat lagi.',
      model: 'fallback',
    }
  }
}

// Generate initial reminder message
export function generateInitialReminder(data: SimulationMemberData): string {
  const namaPendek = data.pesertaProfile.name.split(' ')[0]
  const tunggakan = data.billingInfo.total_tunggakan.toLocaleString('id-ID')
  const periode = data.billingInfo.bulan_menunggak.slice(0, 3).join(', ')

  return `Selamat pagi, Ibu/Bapak ${namaPendek}.

Kami dari BPJS Kesehatan ingin mengingatkan bahwa terdapat tunggakan iuran JKN-KIS:

💰 Total: Rp${tunggakan}
📅 Periode: ${periode}

Mohon segera melakukan pembayaran agar kepesertaan tetap aktif dan Ibu/Bapak dapat terus menikmati layanan kesehatan.

Butuh informasi cara bayar atau ada pertanyaan lain? Silakan hubungi kami.`
}
