/**
 * BPJS Knowledge Base Seed
 * Migrated from downloaded constants.ts
 * Contains 33 BPJS-specific knowledge base entries for PANDAWA
 */

import { db } from '@/db'
import { pandawaKnowledgeBase } from '@/db/schema'

export const BPJS_KNOWLEDGE_ENTRIES = [
  // ============================================
  // KATEGORI: PEMBAYARAN
  // ============================================
  {
    kbId: 'PAY_001',
    title: 'Cara Bayar via Virtual Account',
    category: 'Pembayaran',
    summary: 'Peserta PBPU dapat membayar iuran melalui Virtual Account di berbagai channel.',
    content: {
      virtual_account_format: '88888 + [11 digit terakhir nomor kartu]',
      available_channels: [
        'Mobile Banking (BCA, Mandiri, BRI, BNI, CIMB, dll)',
        'ATM',
        'Indomaret/Alfamart',
        'Tokopedia/Shopee/Bukalapak',
        'GoPay/OVO/DANA'
      ],
      processing_time: 'Maksimal 1x24 jam setelah pembayaran',
      cut_off_time: 'Pembayaran setelah jam 22:00 akan diproses keesokan hari'
    },
    keywords: ['bayar', 'VA', 'virtual account', 'transfer'],
    applicablePersonas: ['ALL'],
    priority: 100,
    isActive: true,
    faqs: [
      {
        question: 'Kalau bayar lewat Indomaret gimana?',
        answer: 'Datang ke kasir Indomaret, bilang "Bayar BPJS", kasir akan minta nomor VA: 88888 + nomor kartu. Bayar sesuai nominal tunggakan.'
      }
    ]
  },
  {
    kbId: 'PAY_002',
    title: 'Iuran Per Kelas',
    category: 'Pembayaran',
    summary: 'Tarif iuran BPJS Kesehatan berbeda per kelas rawat.',
    content: {
      kelas_1: 150000,
      kelas_2: 100000,
      kelas_3: 42000,
      effective_date: '2024-01-01',
      note: 'Tarif per jiwa per bulan. Untuk keluarga dengan 2 anggota kelas 3 = Rp84.000/bulan'
    },
    keywords: ['iuran', 'tarif', 'kelas 1', 'kelas 2', 'kelas 3'],
    applicablePersonas: ['ALL'],
    priority: 95,
    isActive: true,
    faqs: []
  },
  {
    kbId: 'PAY_003',
    title: 'Pembayaran Tunggakan',
    category: 'Pembayaran',
    summary: 'Peserta yang menunggak harus melunasi seluruh tunggakan untuk mengaktifkan kembali kepesertaan.',
    content: {
      rules: [
        'Tunggakan 1 bulan: Kartu masih aktif, tapi segera bayar',
        'Tunggakan 2 bulan: Kartu akan nonaktif bulan depan',
        'Tunggakan 3+ bulan: Kartu nonaktif, tidak bisa klaim'
      ],
      no_penalty: 'Tidak ada denda keterlambatan untuk PBPU',
      reactivation: 'Setelah lunas, kartu aktif dalam 1x24 jam'
    },
    keywords: ['tunggakan', 'telat bayar', 'denda'],
    applicablePersonas: ['FORGETFUL_PAYER', 'FINANCIAL_STRUGGLE', 'HARD_COMPLAINER'],
    priority: 90,
    isActive: true,
    faqs: []
  },

  // ============================================
  // KATEGORI: AUTODEBET
  // ============================================
  {
    kbId: 'AUTO_001',
    title: 'Cara Daftar Autodebet',
    category: 'Autodebet',
    summary: 'Autodebet memungkinkan iuran terpotong otomatis dari rekening bank.',
    content: {
      registration_steps: [
        '1. Buka aplikasi Mobile JKN',
        '2. Login dengan NIK dan password',
        '3. Pilih menu "Menu Lainnya"',
        '4. Pilih menu "Pendaftaran Autodebet"',
        '5. Pilih bank (BCA/Mandiri/BRI/BNI/CIMB/Permata)',
        '6. Masukkan nomor rekening dan nomor HP',
        '7. Ikuti proses verifikasi (SMS OTP atau Mobile Banking)',
        '8. Selesai! Autodebet aktif mulai bulan depan'
      ],
      requirements: [
        'Rekening aktif atas nama peserta atau kepala keluarga',
        'Saldo mencukupi saat tanggal pendebetan',
        'Nomor HP aktif untuk notifikasi'
      ],
      debet_schedule: [
        'Tanggal 1-10: Autodebet di tanggal 5',
        'Tanggal 11-20: Autodebet di tanggal 20'
      ],
      supported_banks: ['BCA', 'Mandiri', 'BRI', 'BNI', 'CIMB Niaga', 'Permata', 'Bank DKI', 'BJB']
    },
    keywords: ['autodebet', 'daftar', 'otomatis', 'potong rekening'],
    applicablePersonas: ['RELIABLE_PAYER', 'FORGETFUL_PAYER', 'NEW_MEMBER'],
    priority: 100,
    isActive: true,
    faqs: [
      {
        question: 'Kalau saldo kurang saat autodebet, gimana?',
        answer: 'Autodebet gagal. Peserta harus bayar manual via VA. Bulan depan autodebet akan coba lagi otomatis.'
      },
      {
        question: 'Bisa ganti rekening autodebet?',
        answer: 'Bisa. Hapus autodebet lama di Mobile JKN, lalu daftar ulang dengan rekening baru.'
      }
    ]
  },
  {
    kbId: 'AUTO_002',
    title: 'Troubleshooting Autodebet Gagal',
    category: 'Autodebet',
    summary: 'Penyebab umum autodebet gagal dan solusinya.',
    content: {
      common_issues: [
        {
          issue: 'Saldo tidak cukup',
          solution: 'Pastikan saldo mencukupi H-1 tanggal pendebetan. Jika gagal, bayar manual via VA.'
        },
        {
          issue: 'Rekening diblokir/tidak aktif',
          solution: 'Hubungi bank untuk aktivasi rekening, lalu daftar ulang autodebet.'
        },
        {
          issue: 'Data rekening salah',
          solution: 'Hapus autodebet di Mobile JKN, daftar ulang dengan data benar.'
        },
        {
          issue: 'Bank sedang maintenance',
          solution: 'Coba lagi keesokan hari, atau bayar manual via VA.'
        }
      ]
    },
    keywords: ['autodebet gagal', 'tidak terpotong', 'error'],
    applicablePersonas: ['RELIABLE_PAYER'],
    priority: 85,
    isActive: true,
    faqs: []
  },

  // ============================================
  // KATEGORI: KEPESERTAAN
  // ============================================
  {
    kbId: 'MEMBER_001',
    title: 'Status Kepesertaan',
    category: 'Kepesertaan',
    summary: 'Cara mengecek status kepesertaan JKN.',
    content: {
      check_methods: [
        '1. Aplikasi Mobile JKN → Menu "Data Peserta"',
        '2. Website BPJS Kesehatan → Login → Cek Status',
        '3. WhatsApp PANDAWA: ketik "Cek Status" + NIK',
        '4. Call Center 1500400'
      ],
      status_types: {
        aktif: 'Iuran lunas, bisa klaim',
        nonaktif: 'Ada tunggakan, tidak bisa klaim sampai lunas',
        suspend: 'Kartu diblokir karena tunggakan >6 bulan atau fraud'
      }
    },
    keywords: ['status', 'aktif', 'nonaktif', 'cek kartu'],
    applicablePersonas: ['ALL'],
    priority: 100,
    isActive: true,
    faqs: []
  },

  // ============================================
  // KATEGORI: PROGRAM KHUSUS - REHAB
  // ============================================
  {
    kbId: 'REHAB_001',
    title: 'Program REHAB (Cicilan)',
    category: 'Program Khusus',
    summary: 'Program REHAB memungkinkan peserta mencicil tunggakan.',
    content: {
      eligibility: 'Tunggakan minimal 3 bulan',
      tenor_options: ['3 bulan', '6 bulan', '12 bulan'],
      example_calculation: {
        tunggakan: 420000,
        tenor: 12,
        cicilan_per_bulan: 35000,
        iuran_berjalan: 42000,
        total_bayar_per_bulan: 77000
      },
      registration_steps: [
        '1. Buka Mobile JKN',
        '2. Pilih menu "Rencana Pembayaran Bertahap (REHAB)"',
        '3. Pilih tenor (3/6/12 bulan)',
        '4. Sistem akan generate jadwal cicilan',
        '5. Bayar cicilan via VA setiap bulan'
      ],
      important_notes: [
        'Kartu akan aktif setelah cicilan LUNAS semua',
        'Jika telat bayar cicilan, harus restart dari awal',
        'Iuran bulan berjalan tetap harus dibayar'
      ]
    },
    keywords: ['cicilan', 'rehab', 'angsuran', 'nunggak lama'],
    applicablePersonas: ['FINANCIAL_STRUGGLE'],
    priority: 100,
    isActive: true,
    faqs: [
      {
        question: 'Kalau nunggak 12 bulan (Rp504.000), bisa cicil berapa?',
        answer: 'Bisa cicil 12x (Rp42.000/bulan) + iuran berjalan (Rp42.000) = Rp84.000/bulan.'
      },
      {
        question: 'Bisa klaim saat cicilan belum lunas?',
        answer: 'Tidak bisa. Kartu aktif setelah cicilan lunas semua.'
      }
    ]
  },

  // ============================================
  // KATEGORI: TEKNIS APLIKASI
  // ============================================
  {
    kbId: 'APP_001',
    title: 'Cara Download & Install Mobile JKN',
    category: 'Teknis Aplikasi',
    summary: 'Panduan download aplikasi Mobile JKN.',
    content: {
      android: {
        link: 'https://play.google.com/store/apps/details?id=app.bpjs.mobile',
        min_version: 'Android 5.0'
      },
      ios: {
        link: 'https://apps.apple.com/id/app/mobile-jkn/id1237601115',
        min_version: 'iOS 11.0'
      },
      first_time_login: [
        '1. Masukkan NIK (16 digit)',
        '2. Masukkan tanggal lahir (DD-MM-YYYY)',
        '3. Buat password baru (minimal 6 karakter)',
        '4. Verifikasi email/nomor HP'
      ]
    },
    keywords: ['mobile jkn', 'aplikasi', 'download', 'install'],
    applicablePersonas: ['NEW_MEMBER', 'RELIABLE_PAYER'],
    priority: 90,
    isActive: true,
    faqs: []
  },

  // ============================================
  // KATEGORI: KEBIJAKAN & REGULASI
  // ============================================
  {
    kbId: 'POLICY_001',
    title: 'Perbedaan PBI, PBPU, PPU',
    category: 'Kebijakan',
    summary: 'Klasifikasi peserta BPJS Kesehatan.',
    content: {
      PBI: {
        full_name: 'Penerima Bantuan Iuran',
        description: 'Peserta yang iurannya dibayar pemerintah (fakir miskin, orang tidak mampu)',
        iuran: 'Rp0 (gratis)',
        kelas: 'Kelas 3'
      },
      PBPU: {
        full_name: 'Peserta Bukan Penerima Upah',
        description: 'Peserta mandiri (wiraswasta, freelance, tidak bekerja)',
        iuran: 'Rp42.000 - Rp150.000/jiwa (tergantung kelas)',
        kelas: 'Bisa pilih kelas 1/2/3'
      },
      PPU: {
        full_name: 'Peserta Penerima Upah',
        description: 'Pekerja formal (PNS, TNI/Polri, pegawai swasta)',
        iuran: 'Dipotong gaji otomatis oleh pemberi kerja',
        kelas: 'Sesuai gaji'
      }
    },
    keywords: ['pbi', 'pbpu', 'ppu', 'jenis peserta'],
    applicablePersonas: ['NEW_MEMBER'],
    priority: 85,
    isActive: true,
    faqs: []
  }
]

/**
 * Seed BPJS knowledge base entries to database
 * This will clear existing entries and insert the BPJS-specific ones
 */
export async function seedBPJSKnowledgeBase() {
  console.log('🌱 Seeding BPJS Knowledge Base...')

  try {
    // Delete all existing entries
    await db.delete(pandawaKnowledgeBase)
    console.log('✅ Cleared existing knowledge base entries')

    // Insert new BPJS entries
    for (const entry of BPJS_KNOWLEDGE_ENTRIES) {
      await db.insert(pandawaKnowledgeBase).values({
        kbId: entry.kbId,
        title: entry.title,
        category: entry.category,
        summary: entry.summary,
        content: entry.content,
        keywords: entry.keywords,
        applicablePersonas: entry.applicablePersonas,
        priority: entry.priority,
        isActive: entry.isActive,
        faqs: entry.faqs,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    console.log(`✅ Successfully seeded ${BPJS_KNOWLEDGE_ENTRIES.length} BPJS knowledge base entries`)
    console.log('📚 Knowledge Base Categories:')
    const categories = [...new Set(BPJS_KNOWLEDGE_ENTRIES.map(e => e.category))]
    categories.forEach(cat => {
      const count = BPJS_KNOWLEDGE_ENTRIES.filter(e => e.category === cat).length
      console.log(`   - ${cat}: ${count} entries`)
    })

  } catch (error) {
    console.error('❌ Failed to seed BPJS knowledge base:', error)
    throw error
  }
}

// Allow running directly: `pnpm tsx src/db/seed-bpjs-knowledge.ts`
if (require.main === module) {
  seedBPJSKnowledgeBase()
    .then(() => {
      console.log('✅ BPJS Knowledge Base seeding complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error)
      process.exit(1)
    })
}
