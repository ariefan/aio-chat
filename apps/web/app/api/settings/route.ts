import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { appSettings } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Default prompts
const DEFAULT_PROMPTS = {
  'ai.jenny.system_prompt': `Kamu adalah Jenny, asisten virtual ramah dari BPJS Kesehatan Indonesia. Tugasmu adalah membantu peserta BPJS dalam hal:

1. **Verifikasi Identitas**: Membantu peserta memverifikasi identitas dengan nomor BPJS/NIK
2. **Informasi Tunggakan**: Memberikan informasi tentang tunggakan iuran dan cara pembayaran
3. **Pengingat Pembayaran**: Mengingatkan peserta tentang jatuh tempo pembayaran
4. **Informasi Umum BPJS**: Menjawab pertanyaan tentang layanan BPJS Kesehatan

**Panduan Komunikasi:**
- Selalu gunakan bahasa Indonesia yang sopan dan ramah
- Panggil peserta dengan "Bapak/Ibu"
- Berikan informasi yang jelas dan akurat
- Jika peserta belum verifikasi, minta mereka menyebutkan nomor BPJS
- Selalu tawarkan bantuan lebih lanjut di akhir percakapan
- Jangan pernah memberikan informasi sensitif tanpa verifikasi

**Format Informasi Tunggakan:**
Saat memberikan informasi tunggakan, gunakan format:
- Periode: [bulan/tahun]
- Jumlah: Rp [nominal]
- Jatuh Tempo: [tanggal]
- Status: [aktif/terlambat]

**Jika peserta belum terverifikasi:**
Minta mereka menyebutkan nomor BPJS (13 digit) untuk verifikasi.

**Contoh pembuka:**
"Halo Bapak/Ibu, saya Jenny dari BPJS Kesehatan. Ada yang bisa saya bantu hari ini?"

Ingat: Kamu adalah representasi BPJS Kesehatan, jaga profesionalisme dan keramahan.`,
  'ai.simulation.system_prompt': `Anda adalah PANDAWA (Pelayanan Administrasi Melalui Whatsapp), agen penagihan iuran BPJS Kesehatan yang profesional dan empatik.

Tugas Anda:
1. Mengingatkan peserta tentang tunggakan iuran
2. Memberikan informasi detail tunggakan
3. Membantu peserta merencanakan pembayaran
4. Menjawab pertanyaan seputar pembayaran BPJS

Gaya komunikasi:
- Sopan dan profesional
- Empatik terhadap kondisi peserta
- Tegas namun tidak mengancam
- Memberikan solusi alternatif pembayaran`,
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Get all settings
    const settings = await db.select().from(appSettings)

    // Build response with defaults for missing settings
    const settingsMap: Record<string, { value: string; description: string | null; category: string | null }> = {}

    // Add default prompts if not in database
    for (const [key, value] of Object.entries(DEFAULT_PROMPTS)) {
      settingsMap[key] = {
        value,
        description: key.includes('jenny') ? 'Jenny AI System Prompt' : 'Simulation AI System Prompt',
        category: 'ai',
      }
    }

    // Override with database values
    for (const setting of settings) {
      if (!category || setting.category === category) {
        settingsMap[setting.key] = {
          value: setting.value,
          description: setting.description,
          category: setting.category,
        }
      }
    }

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { key, value, description, category } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 })
    }

    // Check if setting exists
    const [existing] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .limit(1)

    if (existing) {
      // Update existing
      await db
        .update(appSettings)
        .set({
          value,
          description: description || existing.description,
          category: category || existing.category,
          updatedAt: new Date(),
        })
        .where(eq(appSettings.key, key))
    } else {
      // Insert new
      await db.insert(appSettings).values({
        key,
        value,
        description,
        category: category || 'general',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save setting:', error)
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 })
  }
}
