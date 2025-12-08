/**
 * BPJS Seed Data - Sample members and debts for testing
 *
 * Run with: pnpm db:seed-bpjs
 */

import { db } from './index'
import { bpjsMembers, bpjsDebts, knowledgeDocuments } from './schema'

// Sample BPJS members
const sampleMembers = [
  {
    bpjsId: '0001234567890',
    name: 'Budi Santoso',
    nik: '3201234567890001',
    phone: '081234567890',
    email: 'budi.santoso@email.com',
    address: 'Jl. Merdeka No. 123, Jakarta Pusat',
    memberClass: '1',
    status: 'active' as const,
    registeredAt: new Date('2020-01-15'),
  },
  {
    bpjsId: '0001234567891',
    name: 'Siti Rahayu',
    nik: '3201234567890002',
    phone: '082345678901',
    email: 'siti.rahayu@email.com',
    address: 'Jl. Sudirman No. 456, Jakarta Selatan',
    memberClass: '2',
    status: 'active' as const,
    registeredAt: new Date('2019-06-20'),
  },
  {
    bpjsId: '0001234567892',
    name: 'Ahmad Wijaya',
    nik: '3201234567890003',
    phone: '083456789012',
    email: 'ahmad.wijaya@email.com',
    address: 'Jl. Gatot Subroto No. 789, Bandung',
    memberClass: '3',
    status: 'active' as const,
    registeredAt: new Date('2021-03-10'),
  },
  {
    bpjsId: '0001234567893',
    name: 'Dewi Lestari',
    nik: '3201234567890004',
    phone: '084567890123',
    email: 'dewi.lestari@email.com',
    address: 'Jl. Asia Afrika No. 321, Surabaya',
    memberClass: '2',
    status: 'active' as const,
    registeredAt: new Date('2018-11-05'),
  },
  {
    bpjsId: '0001234567894',
    name: 'Eko Prasetyo',
    nik: '3201234567890005',
    phone: '085678901234',
    email: 'eko.prasetyo@email.com',
    address: 'Jl. Diponegoro No. 654, Yogyakarta',
    memberClass: '1',
    status: 'suspended' as const,
    registeredAt: new Date('2017-08-25'),
  },
]

// Monthly contribution rates by class (in IDR)
const CONTRIBUTION_RATES = {
  '1': 150000, // Kelas 1: Rp 150.000/bulan
  '2': 100000, // Kelas 2: Rp 100.000/bulan
  '3': 42000,  // Kelas 3: Rp 42.000/bulan
}

// Generate debts for a member
function generateDebts(memberId: string, memberClass: string, hasOverdue: boolean = false) {
  const debts = []
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const rate = CONTRIBUTION_RATES[memberClass as keyof typeof CONTRIBUTION_RATES] || CONTRIBUTION_RATES['3']

  // Generate current month debt (due in 7 days)
  const currentDueDate = new Date(currentYear, currentMonth - 1, 10) // Due on 10th
  if (currentDueDate > now) {
    debts.push({
      memberId,
      periodMonth: currentMonth,
      periodYear: currentYear,
      amount: rate,
      dueDate: currentDueDate,
      status: 'active' as const,
      description: `Iuran BPJS bulan ${currentMonth}/${currentYear}`,
    })
  }

  // Generate next month debt
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear
  const nextDueDate = new Date(nextYear, nextMonth - 1, 10)
  debts.push({
    memberId,
    periodMonth: nextMonth,
    periodYear: nextYear,
    amount: rate,
    dueDate: nextDueDate,
    status: 'active' as const,
    description: `Iuran BPJS bulan ${nextMonth}/${nextYear}`,
  })

  // Add overdue debt for some members
  if (hasOverdue) {
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const prevDueDate = new Date(prevYear, prevMonth - 1, 10)
    debts.push({
      memberId,
      periodMonth: prevMonth,
      periodYear: prevYear,
      amount: rate,
      dueDate: prevDueDate,
      status: 'overdue' as const,
      lateFee: Math.round(rate * 0.025), // 2.5% late fee
      description: `Iuran BPJS bulan ${prevMonth}/${prevYear} (TUNGGAKAN)`,
    })
  }

  return debts
}

// BPJS Knowledge base documents
const bpjsKnowledgeDocuments = [
  {
    title: 'Informasi Umum BPJS Kesehatan',
    content: `BPJS Kesehatan adalah Badan Penyelenggara Jaminan Sosial yang menyelenggarakan program Jaminan Kesehatan Nasional (JKN).

**Kelas Kepesertaan:**
- Kelas 1: Rp 150.000/bulan - Kamar rawat inap 1-2 orang
- Kelas 2: Rp 100.000/bulan - Kamar rawat inap 3-4 orang
- Kelas 3: Rp 42.000/bulan - Kamar rawat inap 5-6 orang

**Manfaat Kepesertaan:**
- Pelayanan kesehatan tingkat pertama (Puskesmas, Klinik)
- Pelayanan kesehatan rujukan tingkat lanjutan (Rumah Sakit)
- Pelayanan obat sesuai Formularium Nasional
- Pelayanan alat kesehatan

**Cara Pendaftaran:**
1. Datang ke kantor BPJS Kesehatan terdekat
2. Melalui aplikasi Mobile JKN
3. Melalui website BPJS Kesehatan`,
    type: 'general' as const,
    status: 'published' as const,
    category: 'informasi-umum',
    tags: 'bpjs,kesehatan,jkn,pendaftaran,kelas',
  },
  {
    title: 'Cara Pembayaran Iuran BPJS',
    content: `**Cara Pembayaran Iuran BPJS Kesehatan:**

1. **Mobile Banking**
   - Buka aplikasi mobile banking
   - Pilih menu Pembayaran > BPJS Kesehatan
   - Masukkan nomor peserta BPJS
   - Konfirmasi dan bayar

2. **ATM**
   - Masukkan kartu ATM
   - Pilih menu Pembayaran/Transfer
   - Pilih BPJS Kesehatan
   - Input nomor peserta

3. **Minimarket**
   - Indomaret, Alfamart, Alfamidi
   - Sebutkan pembayaran BPJS Kesehatan
   - Berikan nomor peserta

4. **Kantor Pos**
   - Datang ke kantor pos terdekat
   - Isi formulir pembayaran
   - Bayar iuran

5. **Tokopedia/Bukalapak/Shopee**
   - Pilih menu BPJS Kesehatan
   - Input nomor peserta
   - Lakukan pembayaran

**Catatan Penting:**
- Pembayaran maksimal tanggal 10 setiap bulan
- Keterlambatan dikenakan denda 2.5% per bulan
- Simpan bukti pembayaran`,
    type: 'procedure' as const,
    status: 'published' as const,
    category: 'pembayaran',
    tags: 'pembayaran,iuran,cara,atm,mobile banking',
  },
  {
    title: 'Denda Keterlambatan Pembayaran',
    content: `**Ketentuan Denda Keterlambatan BPJS Kesehatan:**

Berdasarkan Peraturan Presiden Nomor 64 Tahun 2020:

1. **Denda Administrasi**
   - Besaran denda: 2.5% dari biaya iuran per bulan
   - Maksimal denda: 12 bulan x 2.5% = 30%
   - Denda dibayar bersamaan dengan tunggakan

2. **Akibat Keterlambatan:**
   - Status kepesertaan menjadi tidak aktif
   - Tidak dapat menggunakan layanan BPJS
   - Kartu BPJS diblokir sementara

3. **Cara Mengaktifkan Kembali:**
   - Bayar seluruh tunggakan + denda
   - Status aktif kembali setelah pembayaran
   - Dapat menggunakan layanan 7 hari setelah aktivasi

4. **Contoh Perhitungan Denda:**
   Tunggakan 3 bulan Kelas 3 (Rp 42.000):
   - Tunggakan: 3 x Rp 42.000 = Rp 126.000
   - Denda: 3 x 2.5% x Rp 42.000 = Rp 3.150
   - Total bayar: Rp 129.150`,
    type: 'policy' as const,
    status: 'published' as const,
    category: 'denda',
    tags: 'denda,keterlambatan,tunggakan,aktivasi',
  },
  {
    title: 'FAQ Seputar BPJS Kesehatan',
    content: `**Pertanyaan yang Sering Diajukan:**

**Q: Bagaimana cara cek status kepesertaan?**
A: Melalui aplikasi Mobile JKN, website BPJS Kesehatan, atau hubungi Care Center 165.

**Q: Berapa lama kartu aktif setelah pembayaran?**
A: Kartu aktif maksimal 7 hari setelah pembayaran jika ada tunggakan.

**Q: Apakah bisa naik/turun kelas?**
A: Bisa, dengan mengajukan permohonan di kantor BPJS. Efektif bulan berikutnya.

**Q: Bagaimana jika lupa nomor BPJS?**
A: Cek di aplikasi Mobile JKN dengan NIK, atau datang ke kantor BPJS dengan KTP.

**Q: Apakah bisa bayar beberapa bulan sekaligus?**
A: Bisa, maksimal 12 bulan ke depan.

**Q: Bagaimana jika pindah domisili?**
A: Lakukan mutasi kepesertaan di kantor BPJS Kesehatan.

**Q: Apa yang terjadi jika tidak bayar?**
A: Status menjadi tidak aktif dan tidak bisa menggunakan layanan kesehatan.`,
    type: 'faq' as const,
    status: 'published' as const,
    category: 'faq',
    tags: 'faq,pertanyaan,jawaban,bantuan',
  },
]

async function seedBpjsData() {
  console.log('🌱 Seeding BPJS data...')

  try {
    // Insert members
    console.log('📝 Inserting BPJS members...')
    const insertedMembers = []

    for (const member of sampleMembers) {
      const [inserted] = await db
        .insert(bpjsMembers)
        .values(member)
        .onConflictDoNothing()
        .returning()

      if (inserted) {
        insertedMembers.push(inserted)
        console.log(`  ✅ Added member: ${member.name} (${member.bpjsId})`)
      }
    }

    // Insert debts for each member
    console.log('\n💰 Generating debts...')
    for (let i = 0; i < insertedMembers.length; i++) {
      const member = insertedMembers[i]
      if (!member) continue

      // Last two members have overdue debts
      const hasOverdue = i >= insertedMembers.length - 2
      const debts = generateDebts(member.id, member.memberClass || '3', hasOverdue)

      for (const debt of debts) {
        await db.insert(bpjsDebts).values(debt)
      }

      console.log(`  💵 Generated ${debts.length} debts for ${member.name}`)
    }

    // Insert knowledge documents
    console.log('\n📚 Inserting knowledge documents...')
    for (const doc of bpjsKnowledgeDocuments) {
      const [inserted] = await db
        .insert(knowledgeDocuments)
        .values({
          ...doc,
          publishedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning()

      if (inserted) {
        console.log(`  📄 Added document: ${doc.title}`)
      }
    }

    console.log('\n✅ BPJS seed data completed!')
    console.log(`   Members: ${insertedMembers.length}`)
    console.log(`   Documents: ${bpjsKnowledgeDocuments.length}`)

  } catch (error) {
    console.error('❌ Failed to seed BPJS data:', error)
    throw error
  }
}

// Run seeder
seedBpjsData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
