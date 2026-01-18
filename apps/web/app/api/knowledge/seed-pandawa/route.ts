import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { pandawaKnowledgeBase } from '@/db/schema'
import { eq } from 'drizzle-orm'

interface KBEntry {
  kbId: string
  category: string
  subcategory?: string
  title: string
  summary: string
  detailContent: string
  faqs?: Array<{ question: string; answer: string }>
  keywords?: string
  priority?: number
  applicablePersonas?: string[]
}

// PANDAWA Knowledge Base Entries - 45+ structured entries
const PANDAWA_KB_ENTRIES: KBEntry[] = [
  // ==================== PEMBAYARAN (PAY_XXX) ====================
  {
    kbId: 'PAY_001',
    category: 'Pembayaran',
    subcategory: 'Metode Pembayaran',
    title: 'Cara Pembayaran Iuran BPJS',
    summary: 'Berbagai metode pembayaran iuran BPJS Kesehatan yang mudah dan terjangkau',
    detailContent: `Iuran BPJS Kesehatan dapat dibayar melalui berbagai channel:

**1. Channel Digital**
- Mobile JKN (scan QRIS)
- Aplikasi pembayaran (GoPay, OVO, DANA, ShopeePay, LinkAja)
- Internet banking (BCA, Mandiri, BNI, BRI, dll)
- Mobile banking

**2. Channel Konvensional**
- Loket pembayaran (Indomaret, Alfamart, Alfamidi)
- Kantor pos
- Teller bank
- ATM

**3. Autodebet**
- Autodebet kartu kredit
- Autodebet rekening tabungan

Pembayaran paling lambat tanggal 10 setiap bulan. Keterlambatan akan dikenakan denda 2% dari biaya iuran per bulan.`,
    faqs: [
      { question: 'Bagaimana cara bayar iuran BPJS?', answer: 'Iuran BPJS dapat dibayar melalui Mobile JKN, aplikasi pembayaran digital, internet banking, minimarket, kantor pos, dan ATM.' },
      { question: 'Apakah ada biaya admin?', answer: 'Tidak ada biaya admin untuk pembayaran iuran BPJS di hampir semua channel pembayaran.' },
      { question: 'Kapan batas waktu pembayaran?', answer: 'Pembayaran iuran paling lambat tanggal 10 setiap bulan. Lewat dari tanggal 10 akan dikenakan denda 2%.' }
    ],
    keywords: 'bayar,iuran,pembayaran,tagihan,tunggakan,metode,cara',
    applicablePersonas: ['FORGETFUL_PAYER', 'FINANCIAL_STRUGGLE', 'RELIABLE_PAYER'],
    priority: 10
  },
  {
    kbId: 'PAY_002',
    category: 'Pembayaran',
    subcategory: 'Virtual Account',
    title: 'Virtual Account Bank BPJS',
    summary: 'Panduan pembayaran iuran melalui Virtual Account berbagai bank nasional',
    detailContent: `Setiap peserta BPJS Kesehatan memiliki nomor Virtual Account (VA) unik untuk pembayaran iuran.

**Format VA:**
- VA BCA: 88888 + No. Kartu (16 digit)
- VA Mandiri: 88888 + No. Kartu (16 digit)
- VA BNI: 88888 + No. Kartu (16 digit)
- VA BRI: 88888 + No. Kartu (16 digit)
- VA CIMB: 88888 + No. Kartu (16 digit)

**Cara Pembayaran:**
1. Login m-banking atau internet banking
2. Pilih menu "Pembayaran" atau "Transfer"
3. Pilih "BPJS Kesehatan"
4. Masukkan nomor VA atau nomor kartu
5. Masukkan jumlah iuran sesuai kelas
6. Konfirmasi dan selesaikan pembayaran

**Simpan bukti pembayaran** sebagai referensi jika terjadi kendala.`,
    faqs: [
      { question: 'Berapa nomor VA BPJS saya?', answer: 'Nomor VA BPJS Anda adalah 88888 diikuti 16 digit nomor kartu BPJS Anda.' },
      { question: 'Bisa bayar di bank berbeda?', answer: 'Ya, pembayaran bisa dilakukan di semua bank yang telah bekerja sama dengan BPJS Kesehatan.' }
    ],
    keywords: 'virtual account,va,bank,bca,mandiri,bni,bri,cimb,pembayaran',
    applicablePersonas: ['FORGETFUL_PAYER', 'RELIABLE_PAYER'],
    priority: 9
  },
  {
    kbId: 'PAY_003',
    category: 'Pembayaran',
    subcategory: 'Minimarket',
    title: 'Pembayaran via Minimarket',
    summary: 'Panduan pembayaran iuran BPJS di Indomaret, Alfamart, dan Alfamidi',
    detailContent: `Pembayaran iuran BPJS Kesehatan dapat dilakukan di minimarket terdekat:

**Syarat Pembayaran:**
- Nomor kartu BPJS (13 digit)
- Jumlah iuran sesuai kelas:
  * Kelas 1: Rp150.000
  * Kelas 2: Rp100.000
  * Kelas 3: Rp35.000
  * (Bukan PBI)

**Langkah-langkah:**
1. Datang ke kasir minimarket
2. Sebutkan "Bayar BPJS Kesehatan"
3. Tunjukkan/sampaikan nomor kartu BPJS
4. Konfirmasi nama dan jumlah iuran
5. Bayar di kasir
6. Simpan struk sebagai bukti

**Catatan:**
- Pembayaran akan terupdate dalam 1x24 jam
- Struk pembayaran wajib disimpan
- Tidak ada biaya tambahan`,
    faqs: [
      { question: 'Apakah ada biaya admin di minimarket?', answer: 'Tidak ada biaya admin untuk pembayaran BPJS di minimarket.' },
      { question: 'Berapa lama pembayaran terproses?', answer: 'Pembayaran di minimarket akan terupdate dalam sistem BPJS maksimal 1x24 jam.' }
    ],
    keywords: 'minimarket,indomaret,alfamart,alfamidi,anggan,tunai',
    applicablePersonas: ['FORGETFUL_PAYER', 'RELIABLE_PAYER'],
    priority: 8
  },
  {
    kbId: 'PAY_004',
    category: 'Pembayaran',
    subcategory: 'E-Commerce',
    title: 'Pembayaran E-Commerce',
    summary: 'Pembayaran iuran BPJS melalui platform e-commerce dan marketplace',
    detailContent: `Pembayaran iuran BPJS Kesehatan kini dapat dilakukan melalui berbagai e-commerce:

**Platform Tersedia:**
1. Tokopedia - Menu "Tagihan" → "BPJS Kesehatan"
2. Shopee - Menu "Pulsa, Tagihan & Hiburan" → "BPJS Kesehatan"
3. Bukalapak - Menu "Tagihan" → "BPJS"
4. Traveloka - Menu "BPJS Kesehatan"
5. Blibli - Menu "Tagihan" → "BPJS Kesehatan"

**Langkah Umum:**
1. Buka aplikasi e-commerce
2. Pilih menu "Tagihan" atau "BPJS"
3. Masukkan nomor kartu BPJS
4. Konfirmasi nama dan jumlah iuran
5. Pilih metode pembayaran (saldo, kartu kredit, transfer)
6. Selesaikan pembayaran

**Keuntungan:**
- Bisa bayar kapan saja 24/7
- Bisa pakai promo cashback
- Ada reminder otomatis`,
    faqs: [
      { question: 'Platform e-commerce apa saja yang menyediakan pembayaran BPJS?', answer: 'Tokopedia, Shopee, Bukalapak, Traveloka, Blibli menyediakan layanan pembayaran BPJS.' },
      { question: 'Apakah ada promo cashback?', answer: 'Sering ada promo cashback dari e-commerce. Cek promosi di masing-masing platform.' }
    ],
    keywords: 'ecommerce,tokopedia,shopee,bukalapak,traveloka,blibli,online,marketplace',
    applicablePersonas: ['FORGETFUL_PAYER', 'RELIABLE_PAYER', 'NEW_MEMBER'],
    priority: 7
  },
  {
    kbId: 'PAY_005',
    category: 'Pembayaran',
    subcategory: 'Denda',
    title: 'Denda Keterlambatan Pembayaran',
    summary: 'Informasi lengkap mengenai denda keterlambatan pembayaran iuran BPJS',
    detailContent: `**Kebijakan Denda BPJS Kesehatan:**

Peserta akan dikenakan denda jika:
- Tidak membayar iuran > 1 bulan
- Denda: 2% dari biaya iuran per bulan

**Contoh Perhitungan:**
- Kelas 3 (Rp35.000) telat 6 bulan:
  - Denda: 6 x 2% x Rp35.000 = Rp4.200
  - Total tunggakan: 6 x Rp35.000 + Rp4.200 = Rp214.200

**Cara Menghitung Denda:**
\`\`\`
Denda = Jumlah Bulan Telat x 2% x Biaya Iuran Kelas
\`\`\`

**Pengecualian:**
- Peserta PBI tidak dikenakan denda
- Peserta yang sedang menjalani rawat inap

**Cara Bayar Tunggakan + Denda:**
Bayar di semua channel pembayaran biasa, sistem akan otomatis menghitung total yang harus dibayar.`,
    faqs: [
      { question: 'Berapa persen denda keterlambatan BPJS?', answer: 'Denda keterlambatan adalah 2% dari biaya iuran per bulan.' },
      { question: 'Apakah PBI kena denda?', answer: 'Tidak, peserta PBI tidak dikenakan denda keterlambatan.' },
      { question: 'Bagaimana cara menghitung denda?', answer: 'Denda = jumlah bulan telat × 2% × biaya iuran kelas Anda.' }
    ],
    keywords: 'denda,keterlambatan,telat,tunggakan,sanksi,biaya,hukuman',
    applicablePersonas: ['FORGETFUL_PAYER', 'FINANCIAL_STRUGGLE'],
    priority: 10
  },
  {
    kbId: 'PAY_006',
    category: 'Pembayaran',
    subcategory: 'Bukti Pembayaran',
    title: 'Cek dan Dapatkan Bukti Pembayaran',
    summary: 'Cara mendapatkan bukti pembayaran iuran BPJS yang sah',
    detailContent: `Bukti pembayaran BPJS Kesehatan penting untuk berbagai keperluan administrasi.

**Cara Mendapatkan Bukti Pembayaran:**

**1. Via Mobile JKN**
- Buka aplikasi
- Pilih "Kartu Peserta"
- Pilih "Riwayat Pembayaran"
- Download bukti pembayaran

**2. Via Website**
- Kunjungi bpjs-kesehatan.go.id
- Login dengan nomor kartu
- Pilih "Riwayat Pembayaran"
- Cetak/download bukti

**3. Datang ke Kantor BPJS**
- Membawa KTP dan kartu BPJS
- Minta cetak bukti pembayaran
- Gratis tanpa biaya

**4. Via Chat PANDAWA**
- Kirim: "BUKTI BAYAR [bulan]"
- Dapatkan link bukti pembayaran

**Informasi di Bukti Pembayaran:**
- Nama peserta
- Nomor kartu
- Periode pembayaran
- Jumlah yang dibayar
- Status kepesertaan aktif`,
    faqs: [
      { question: 'Bagaimana cara dapat bukti bayar BPJS?', answer: 'Via Mobile JKN (menu Riwayat Pembayaran), website bpjs-kesehatan.go.id, atau datang ke kantor BPJS.' },
      { question: 'Apakah bukti pembayaran berbayar?', answer: 'Tidak, bukti pembayaran BPJS gratis dan bisa diunduh kapan saja.' }
    ],
    keywords: 'bukti,pembayaran,invoice,kwitansi,history,riwayat,cetak',
    applicablePersonas: ['RELIABLE_PAYER', 'FORGETFUL_PAYER'],
    priority: 7
  },

  // ==================== AUTODEBET (AUTO_XXX) ====================
  {
    kbId: 'AUTO_001',
    category: 'Autodebet',
    subcategory: 'Pendaftaran',
    title: 'Cara Daftar Autodebet',
    summary: 'Panduan pendaftaran autodebet iuran BPJS agar tidak lupa bayar',
    detailContent: `Autodebet adalah layanan pembayaran otomatis iuran BPJS setiap bulan.

**Keuntungan Autodebet:**
✓ Tidak perlu ingat tanggal bayar
✓ Terhindar dari denda keterlambatan
✓ Kepesertaan selalu aktif
✓ Praktis dan otomatis

**Jenis Autodebet:**

**1. Autodebet Kartu Kredit**
- Daftar di kantor BPJS atau bank
- Potong iuran otomatis tiap bulan
- Semua bank kartu kredit

**2. Autodebet Rekening Tabungan**
- Daftar di kantor BPJS
- BCA, Mandiri, BNI, BRI, CIMB
- Rekening pribadi atau perusahaan

**Syarat Pendaftaran:**
1. Isi form permohonan autodebet di kantor BPJS
2. Lampiri:
   - FC KTP
   - FC Kartu BPJS
   - FC Kartu Kredit/Buku Rekening
3. Tunggu aktivasi (7 hari kerja)
4. Dapat notifikasi via SMS

**Pendaftaran Via Perusahaan:**
- Minta HRD untuk mendaftarkan
- Potong otomatis dari gaji
- Lebih praktis untuk karyawan`,
    faqs: [
      { question: 'Apa itu autodebet BPJS?', answer: 'Autodebet adalah layanan pembayaran otomatis iuran BPJS dari kartu kredit atau rekening tabungan setiap bulan.' },
      { question: 'Bagaimana cara daftar autodebet?', answer: 'Daftar di kantor BPJS dengan membawa KTP, kartu BPJS, dan kartu kredit/buku rekening. Aktivasi 7 hari kerja.' }
    ],
    keywords: 'autodebet,otomatis,potong,daftar,kartu kredit,rekening,auto pay',
    applicablePersonas: ['FORGETFUL_PAYER', 'RELIABLE_PAYER'],
    priority: 10
  },
  {
    kbId: 'AUTO_002',
    category: 'Autodebet',
    subcategory: 'Masalah',
    title: 'Autodebet Gagal',
    summary: 'Penyebab dan solusi ketika autodebet BPJS gagal',
    detailContent: `Autodebet bisa gagal karena beberapa alasan:

**Penyebab Umum:**
1. Saldo/kartu kredit tidak cukup
2. Kartu kredit expired/blocked
3. Rekening ditutup/dibekukan
4. Sistem bank sedang gangguan
5. Data autodebet tidak update

**Cara Cek Status Autodebet:**
1. Via Mobile JKN:
   - Menu "Peserta" → "Autodebet"
2. Via CS BPJS:
   - Call 165
   - Cek status autodebet

**Solusi Autodebet Gagal:**

**Jika Saldo Tidak Cukup:**
- Isi saldo sebelum tanggal 10
- Aktifkan fitur autodebet ulang

**Jika Kartu Expired:**
- Daftar ulang autodebet dengan kartu baru
- Datang ke kantor BPJS atau bank

**Jika Rekening Beku:**
- Hubungi bank untuk unblokir
- Atau ganti ke rekening lain

**Jika Gangguan Sistem:**
- Tunggu 1-2 hari
- Bayar manual jika mendesak
- Komplain ke 165 jika berlanjut

**Mencegah Autodebet Gagal:**
- Pastikan saldo cukup setiap tanggal 5
- Cek masa berlaku kartu kredit
- Update data jika ganti kartu/rekening`,
    faqs: [
      { question: 'Kenapa autodebet BPJS saya gagal?', answer: 'Biasanya karena saldo tidak cukup, kartu expired, rekening bermasalah, atau gangguan sistem bank.' },
      { question: 'Bagaimana jika autodebet gagal terus?', answer: 'Cek saldo/kartu, hubungi bank jika ada masalah, atau datang ke kantor BPJS untuk daftar ulang.' }
    ],
    keywords: 'gagal,error,masalah,autodebet,tidak potong,bermasalah',
    applicablePersonas: ['FORGETFUL_PAYER', 'FINANCIAL_STRUGGLE'],
    priority: 9
  },
  {
    kbId: 'AUTO_003',
    category: 'Autodebet',
    subcategory: 'Ubah Metode',
    title: 'Ubah Metode Autodebet',
    summary: 'Cara mengubah metode atau sumber pembayaran autodebet BPJS',
    detailContent: `Mengubah metode autodebet diperlukan jika:
- Ganti kartu kredit karena expired
- Ganti rekening bank
- Ingin ganti bank penyedia autodebet
- Berhenti jadi karyawan (autodebet perusahaan)

**Langkah Mengubah Autodebet:**

**1. Tutup Autodebet Lama**
- Datang ke kantor BPJS
- Minta "Berhenti Autodebet"
- Isi form penutupan
- Proses 1-3 hari kerja

**2. Daftar Autodebet Baru**
- Setelah autodebet lama nonaktif
- Daftar autodebet baru
- Bisa beda bank/kartu

**Syarat Mengubah:**
- Form permohonan ubah autodebet
- FC KTP
- FC Kartu BPJS
- FC kartu kredit/rekening baru
- Tidak ada tunggakan iuran

**Via Perusahaan:**
- Jika karyawan, hubungi HRD
- Minta update autodebet baru
- Proses via perusahaan lebih cepat

**Catatan Penting:**
- Autodebet tidak bisa dipindah otomatis
- Harus tutup lama dulu, baru daftar baru
- Pastikan bayar manual saat transisi`,
    faqs: [
      { question: 'Bagaimana cara ubah metode autodebet BPJS?', answer: 'Tutup dulu autodebet lama di kantor BPJS, tunggu 1-3 hari, lalu daftar autodebet baru dengan metode yang diinginkan.' },
      { question: 'Berapa lama proses ubah autodebet?', answer: 'Proses penutupan autodebet lama 1-3 hari kerja, kemudian daftar autodebet baru butuh 7 hari untuk aktif.' }
    ],
    keywords: 'ubah,ganti,metode,autodebet,kartu,rekening,bank',
    applicablePersonas: ['RELIABLE_PAYER', 'FORGETFUL_PAYER'],
    priority: 6
  },
  {
    kbId: 'AUTO_004',
    category: 'Autodebet',
    subcategory: 'Pembatalan',
    title: 'Batalkan Autodebet',
    summary: 'Prosedur pembatalan autodebet iuran BPJS',
    detailContent: `Pembatalan autodebet mungkin diperlukan karena:
- Ingin bayar manual
- Berhenti jadi peserta mandiri
- Ganti jadi peserta PBI
- Ingin ganti metode pembayaran

**Langkah Pembatalan:**

**1. Datang ke Kantor BPJS**
- Bawa KTP asli + FC
- Bawa kartu BPJS
- Isi form "Permohonan Berhenti Autodebet"
- Tunggu proses (1-3 hari kerja)

**2. Via Customer Care 165**
- Call ke 165
- Minta batalkan autodebet
- Verifikasi data KTP
- Proses 3-7 hari kerja

**3. Via Perusahaan (Jika Karyawan)**
- Minta HRD untuk stop autodebet
- Proses internal perusahaan
- Hubungi BPJS untuk konfirmasi

**Setelah Pembatalan:**
- Bayar iuran manual setiap bulan
- Tanggal 1-10 setiap bulan
- Lewat tanggal 10 kena denda

**Catatan:**
- Tidak ada biaya pembatalan
- Pastikan bayar iuran bulan berjalan
- Bisa daftar autodebet lagi kapan saja`,
    faqs: [
      { question: 'Bagaimana cara berhenti autodebet BPJS?', answer: 'Datang ke kantor BPJS dengan KTP dan kartu BPJS, isi form permohonan berhenti autodebet. Proses 1-3 hari kerja.' },
      { question: 'Apakah ada biaya untuk batalkan autodebet?', answer: 'Tidak, pembatalan autodebet BPJS gratis tanpa biaya administrasi.' }
    ],
    keywords: 'batalkan,berhenti,stop,autodebet,nonaktif,cancel',
    applicablePersonas: ['RELIABLE_PAYER', 'FORGETFUL_PAYER', 'FINANCIAL_STRUGGLE'],
    priority: 5
  },

  // ==================== KEPESERTAAN (MEMBER_XXX) ====================
  {
    kbId: 'MEMBER_001',
    category: 'Kepesertaan',
    subcategory: 'Status',
    title: 'Cek Status Kepesertaan',
    summary: 'Cara mengecek status kepesertaan BPJS Kesehatan secara online dan offline',
    detailContent: `Mengetahui status kepesertaan penting untuk memastikan perlindungan kesehatan tetap aktif.

**Cara Cek Status Kepesertaan:**

**1. Via Mobile JKN (Paling Praktis)**
- Download aplikasi Mobile JKN
- Login dengan nomor kartu
- Status langsung terlihat di dashboard

**2. Via Website BPJS**
- Kunjungi bpjs-kesehatan.go.id
- Klik "Cek Status Peserta"
- Masukkan nomor kartu
- Status akan muncul

**3. Via WhatsApp PANDAWA**
- Chat: "STATUS" atau "CEK STATUS"
- Otomatis dapat info status
- 24 jam nonstop

**4. Via SMS**
- Ketik: STATUS [spasi] Nomor Kartu
- Kirim ke 165
- Balas via SMS

**5. Via Call Center 165**
- Call ke 165
- Ikuti voice prompt
- Customer service akan bantu

**6. Datang ke Kantor BPJS**
- Bawa kartu dan KTP
- Minta petugas cek status
- Gratis tanpa biaya

**Status Kepesertaan:**
- **AKTIF** - Perlindungan berjalan normal
- **TIDAK AKTIF** - Ada tunggakan > 3 bulan
- **MENUNGGU AKTIVASI** - Baru daftar, proses verifikasi

**Segera bayar tunggakan jika status tidak aktif!**`,
    faqs: [
      { question: 'Bagaimana cara cek status kepesertaan BPJS?', answer: 'Via Mobile JKN (paling mudah), website bpjs-kesehatan.go.id, WhatsApp ketik "STATUS", SMS ke 165, atau call 165.' },
      { question: 'Apa yang terjadi jika status kepesertaan tidak aktif?', answer: 'Status tidak aktif berarti ada tunggakan lebih dari 3 bulan. Segera bayar tunggakan untuk reaktivasi.' }
    ],
    keywords: 'cek,status,kepesertaan,aktif,tidak aktif,verifikasi',
    applicablePersonas: ['NEW_MEMBER', 'FORGETFUL_PAYER', 'RELIABLE_PAYER'],
    priority: 10
  },
  {
    kbId: 'MEMBER_002',
    category: 'Kepesertaan',
    subcategory: 'Kelas Rawat',
    title: 'Ganti Kelas Rawat',
    summary: 'Panduan mengubah kelas rawat inap BPJS Kesehatan',
    detailContent: `Peserta dapat mengubah kelas rawat sesuai kemampuan finansial.

**Kelas Rawat BPJS:**
- **Kelas 1** - Rp150.000/bulan (Kamar VIP, fasilitas lengkap)
- **Kelas 2** - Rp100.000/bulan (Kamar 2-3 bed, fasilitas standar)
- **Kelas 3** - Rp35.000/bulan (Kamar banyak bed, fasilitas dasar)

**Kebijakan Ganti Kelas:**

**Naik Kelas (3→2→1):**
- Bisa kapan saja
- Bayar selisih iuran bulan berjalan
- Tunggu 1 bulan untuk efektif

**Turun Kelas (1→2→3):**
- Minimal 12 bulan di kelas saat ini
- Tidak ada tunggakan iuran
- Efektif bulan berikutnya

**Cara Ganti Kelas:**

**1. Via Mobile JKN**
- Menu "Peserta" → "Ubah Kelas"
- Pilih kelas baru
- Konfirmasi

**2. Datang ke Kantor BPJS**
- Bawa KTP + FC
- Bawa kartu BPJS
- Isi form permohonan ganti kelas
- Gratis tanpa biaya

**3. Via Chat PANDAWA**
- Ketik: "GANTI KELAS [kelas tujuan]"
- Dapatkan panduan

**Catatan Penting:**
- Ganti kelas bukan ganti kamar saat rawat inap
- Kelas rawat menentukan iuran, bukan kamar fisik
- Bisa ganti kapan saja sesuai aturan`,
    faqs: [
      { question: 'Bagaimana cara ganti kelas rawat BPJS?', answer: 'Via Mobile JKN (menu Ubah Kelas), datang ke kantor BPJS, atau chat PANDAWA. Naik kelas bisa kapan saja, turun kelas minimal 12 bulan.' },
      { question: 'Berapa biaya iuran per kelas?', answer: 'Kelas 1: Rp150.000, Kelas 2: Rp100.000, Kelas 3: Rp35.000 per bulan.' }
    ],
    keywords: 'ganti,kelas,rawat,naik,turun,upgrade,downgrade,iuran',
    applicablePersonas: ['RELIABLE_PAYER', 'FINANCIAL_STRUGGLE'],
    priority: 8
  },
  {
    kbId: 'MEMBER_003',
    category: 'Kepesertaan',
    subcategory: 'Keluarga',
    title: 'Tambah Anggota Keluarga',
    summary: 'Cara menambahkan anggota keluarga ke kepesertaan BPJS',
    detailContent: `Keluarga Peserta dapat ditambahkan sebagai tanggungan dalam satu kepesertaan.

**Syarat Penambahan Anggota:**
1. Suami/istri (sah secara hukum)
2. Anak kandung maksimal 5 orang
3. Anak tiri (dengan dokumentasi jelas)
4. Orang tua (jika peserta menanggung)

**Dokumen yang Diperlukan:**
- FC Kartu Keluarga (KK)
- FC Buku Nikah (untuk suami/istri)
- FC Akta Lahir (untuk anak)
- FC KTP pemegang kartu
- Kartu BPJS pemegang kartu

**Cara Menambah Anggota:**

**1. Datang ke Kantor BPJS**
- Bawa semua dokumen asli + FC
- Isi form penambahan anggota
- Proses 1-3 hari kerja
- Gratis

**2. Via Mobile JKN (Terbatas)**
- Menu "Keluarga" → "Tambah Anggota"
- Upload dokumen
- Tunggu verifikasi

**3. Via Perusahaan (Untuk Karyawan)**
- Minta HRD untuk tambah keluarga
- Serahkan dokumen ke HRD
- Proses via perusahaan

**Biaya Tambahan:**
- Iuran bertambah sesuai jumlah anggota
- Maksimal 5 orang tanggungan
- Iuran tetap sama meski banyak tanggungan

**Contoh:**
- 1 orang: Rp35.000
- 2-5 orang: Tetap Rp35.000
- 6 orang: Harus buat kepesertaan baru`,
    faqs: [
      { question: 'Bagaimana cara menambah keluarga di BPJS?', answer: 'Datang ke kantor BPJS dengan membawa KK, buku nikah, akta lahir, dan KTP. Isi form penambahan anggota. Proses 1-3 hari.' },
      { question: 'Berapa biaya tambah anggota keluarga?', answer: 'Tidak ada biaya tambahan. Iuran tetap sama Rp35.000 untuk 1-5 orang dalam satu kartu keluarga.' }
    ],
    keywords: 'tambah,keluarga,anggota,tanggungan,istri,suami,anak,kk',
    applicablePersonas: ['NEW_MEMBER', 'RELIABLE_PAYER'],
    priority: 9
  },
  {
    kbId: 'MEMBER_004',
    category: 'Kepesertaan',
    subcategory: 'Nonaktif',
    title: 'Nonaktifkan Kepesertaan',
    summary: 'Prosedur menonaktifkan kepesertaan BPJS Kesehatan',
    detailContent: `Penonaktifan kepesertaan mungkin diperlukan jika:
- Meninggal dunia
- Pindah ke negara lain
- Ingin berhenti menjadi peserta mandiri
- Sudah memiliki jaminan kesehatan lain

**Kategori Penonaktifan:**

**1. Karena Meninggal**
- Dilakukan oleh ahli waris
- Bawa surat kematian dari rumah sakit
- Buka rekening baru untuk ahli waris

**2. Pindah Negara**
- Bawa paspor + tiket
- Surat pindah kerja/studi
- Nonaktif permanen

**3. Berhenti Mandiri**
- Datang ke kantor BPJS
- Bawa KTP + kartu
- Isi form penonaktifan
- Tidak bisa diaktifkan lagi 6 bulan

**4. Sudah Punya Jaminan Lain**
- Bawa bukti jaminan (Asuransi/Asn/BPJS Perusahaan)
- Nonaktif sementara atau permanen

**Cara Menonaktifkan:**

**Langkah-langkah:**
1. Datang ke kantor BPJS terdekat
2. Bawa dokumen pendukung
3. Isi form permohonan nonaktif
4. Serahkan kartu BPJS asli
5. Proses 1-3 hari kerja

**Catatan Penting:**
- Tunggakan harus lunas sebelum nonaktif
- Tidak bisa nonaktif sepihak via WA/SMS
- Harus datang ke kantor BPJS
- Segera aktifkan kembali jika ingin melanjutkan`,
    faqs: [
      { question: 'Bagaimana cara menonaktifkan kepesertaan BPJS?', answer: 'Datang ke kantor BPJS dengan KTP, kartu BPJS, dan dokumen pendukung. Isi form permohonan nonaktif. Proses 1-3 hari kerja.' },
      { question: 'Apakah bisa nonaktifkan kepesertaan via online?', answer: 'Tidak, penonaktifan kepesertaan harus dilakukan dengan datang langsung ke kantor BPJS.' }
    ],
    keywords: 'nonaktif,berhenti,stop,meninggal,pindah,putus,kepesertaan',
    applicablePersonas: ['NEW_MEMBER', 'RELIABLE_PAYER', 'FINANCIAL_STRUGGLE'],
    priority: 5
  },
  {
    kbId: 'MEMBER_005',
    category: 'Kepesertaan',
    subcategory: 'Reaktivasi',
    title: 'Reaktivasi Kepesertaan',
    summary: 'Cara mengaktifkan kembali kepesertaan BPJS yang sudah nonaktif',
    detailContent: `Kepesertaan yang nonaktif karena tunggakan bisa diaktifkan kembali.

**Syarat Reaktivasi:**
- Lunasi semua tunggakan iuran
- Lunasi denda keterlambatan
- Tidak ada masalah administrasi

**Kategori Reaktivasi:**

**1. Nonaktif < 3 Bulan**
- Bayar tunggakan saja
- Otomatis aktif setelah bayar
- Tidak perlu ke kantor

**2. Nonaktif 3-6 Bulan**
- Bayar tunggakan + denda
- Aktif otomatis setelah bayar
- Tidak perlu ke kantor

**3. Nonaktif > 6 Bulan**
- Bayar tunggakan + denda
- WAJIB daftar ulang di kantor
- Dapat nomor kartu baru
- Proses 7-14 hari kerja

**4. Nonaktif > 24 Bulan**
- Bayar tunggakan + denda
- Daftar ulang dari awal
- Seperti peserta baru
- Proses 14-30 hari kerja

**Cara Melakukan Reaktivasi:**

**Untuk Nonaktif < 6 Bulan:**
1. Hitung total tunggakan + denda
2. Bayar di channel mana saja
3. Cek status setelah 1x24 jam
4. Status akan aktif kembali

**Untuk Nonaktif > 6 Bulan:**
1. Bayar semua tunggakan + denda
2. Datang ke kantor BPJS
3. Bawa KTP + KK + bukti bayar
4. Daftar ulang kepesertaan
5. Dapat kartu baru

**Cek Tagihan Tunggakan:**
- Chat PANDAWA: "TAGIHAN SAYA"
- Atau cek di Mobile JKN

**Segera reaktivasi agar jaminan kesehatan kembali aktif!**`,
    faqs: [
      { question: 'Bagaimana cara mengaktifkan kembali BPJS yang nonaktif?', answer: 'Bayar semua tunggakan + denda. Jika nonaktif < 6 bulan, otomatis aktif. Jika > 6 bulan, harus daftar ulang di kantor BPJS.' },
      { question: 'Berapa lama proses reaktivasi kepesertaan?', answer: 'Nonaktif < 6 bulan: aktif otomatis 1x24 jam. Nonaktif > 6 bulan: 7-14 hari kerja untuk daftar ulang.' }
    ],
    keywords: 'reaktif,aktif,kembali,nonaktif,tunggakan,lunasi,daftar ulang',
    applicablePersonas: ['FORGETFUL_PAYER', 'FINANCIAL_STRUGGLE'],
    priority: 10
  },

  // ==================== KLAIM (CLAIM_XXX) ====================
  {
    kbId: 'CLAIM_001',
    category: 'Klaim',
    subcategory: 'Rawat Inap',
    title: 'Cara Klaim Rawat Inap',
    summary: 'Panduan lengkap prosedur klaim jaminan rawat inap BPJS',
    detailContent: `Rawat inap dengan BPJS Kesehatan menggunakan sistem **rujuk rawat inap**.

**Prosedur Klaim Rawat Inap:**

**1. Kunjungi Faskes 1 Tingkat (GP/Puskesmas)**
- Periksa ke dokter
- Jelaskan kondisi yang butuh rawat inap
- Minta surat rujukan rawat inap

**2. Dapatkan Surat Rujukan**
- Dokter menilai perlu rawat inap
- Terbit surat rujukan BPJS
- Berlaku maksimal 30 hari

**3. Datang ke RS Tujuan**
- Bawa surat rujukan
- Bawa kartu BPJS
- Bawa KTP
- Daftar di instalasi BPJS RS

**4. Verifikasi BPJS di RS**
- Petugas RS verifikasi surat rujukan
- Status kepesertaan dicek
- Jika valid, rawat inap ditanggung penuh

**5. Rawat Inap**
- Perawatan sesuai kelas rawat
- Obat-obatan ditanggung
- Tindakan medis ditanggung
- Tanpa batas plafon (unlimited)

**Catatan Penting:**
- **WAJIB bawa surat rujukan** (kecuali IGD kecelakaan/urgent)
- Rawat inap tanpa rujukan = TIDAK ditanggung
- Rujukan berlaku 30 hari
- Bisa rawat di semua RS kerjasama BPJS

**Kecelakaan Laka/IGD Urgent:**
- Boleh langsung ke RS tanpa rujukan
- Wajib lapor polisi untuk laka
- Melapor ke BPJS maksimal 30 hari`,
    faqs: [
      { question: 'Bagaimana cara klaim rawat inap BPJS?', answer: 'Kunjungi Faskes 1, minta surat rujukan rawat inap dari dokter, bawa ke RS tujuan, verifikasi kartu BPJS di RS, rawat inap gratis.' },
      { question: 'Apakah boleh langsung ke RS tanpa rujukan?', answer: 'Hanya untuk keadaan darurat/IGD atau kecelakaan. Selain itu WAJIB bawa surat rujukan dari Faskes 1.' }
    ],
    keywords: 'rawat inap,rs,rumah sakit,rujukan,klaim,gratis,tanggung',
    applicablePersonas: ['NEW_MEMBER', 'RELIABLE_PAYER', 'FINANCIAL_STRUGGLE'],
    priority: 10
  },
  {
    kbId: 'CLAIM_002',
    category: 'Klaim',
    subcategory: 'Rawat Jalan',
    title: 'Cara Klaim Rawat Jalan',
    summary: 'Panduan berobat rawat jalan dengan jaminan BPJS Kesehatan',
    detailContent: `Rawat jalan dengan BPJS menggunakan sistem berjenjang (tiering).

**Alur Rawat Jalan:**

**1. Faskes 1 Tingkat (Pertama)**
**Pilihan Faskes 1:**
- Puskesmas
- Klinik Pratama BPJS
- Dokter Gigi Praktik Perorangan
- Dokter Umum Praktik Perorangan

**Prosedur:**
- Datang ke Faskes 1 pilihan
- Bawa kartu BPJS + KTP
- Periksa ke dokter
- Obat ditanggung di apotek Faskes 1

**2. Rujukan ke Faskes 2 (Spesialis)**
**Jika butuh penanganan spesialis:**
- Dokter Faskes 1 akan memberi surat rujukan
- Bawa rujukan ke RS/spesialis
- Rujukan berlaku 30 hari

**Faskes 2 Tingkat (Spesialis):**
- RS Tipe D (Spesialis tertentu)
- RS Tipe C (Lebih lengkap)
- RS Tipe B (Sangat lengkap)
- RS Tipe A (Paling lengkap)

**Jenis Rujukan:**
- **Rujukan Poli Spesialis** - Untuk keluhan spesifik
- **Rujukan Rawat Inap** - Untuk rawat inap
- **Rujukan CT-Scan/Lab** - Untuk pemeriksaan khusus

**Kontrol Ulang:**
- Cukup ke Faskes 1 saja
- Tidak perlu rujukan baru untuk kontrol
- Kecuali ganti penyakit/spesialis

**Catatan:**
- Tidak bisa langsung ke spesialis tanpa rujukan
- Obat di apotek eksternal tidak gratis (tanggung Faskes 1)`,
    faqs: [
      { question: 'Bagaimana alur berobat jalan dengan BPJS?', answer: 'Mulai di Faskes 1 (Puskesmas/klinik). Jika perlu spesialis, minta rujukan dokter Faskes 1 ke RS/spesialis.' },
      { question: 'Apakah bisa langsung ke spesialis?', answer: 'Tidak bisa, kecuali rujukan konsultasi gizi, psikolog, atau dokter gigis. Selain itu WAJIB rujukan dari Faskes 1.' }
    ],
    keywords: 'rawat jalan,berobat,faskes,puskesmas,klinik,rujukan,spesialis',
    applicablePersonas: ['NEW_MEMBER', 'RELIABLE_PAYER', 'FINANCIAL_STRUGGLE'],
    priority: 10
  },
  {
    kbId: 'CLAIM_003',
    category: 'Klaim',
    subcategory: 'Faskes',
    title: 'Faskes Tiering dan Rujukan',
    summary: 'Sistem tiering faskes BPJS dan aturan rujukan berjenjang',
    detailContent: `BPJS Kesehatan menggunakan sistem **berjenjang (tiering)** untuk memberikan pelayanan yang efektif.

**Struktur Faskes BPJS:**

**Faskes 1 Tingkat (Pertama)**
- Puskesmas
- Klinik Pratama BPJS
- Dokter Gigi Praktik Perorangan
- Dokter Umum Praktik Perorangan

**Faskes 2 Tingkat (Lanjutan)**
- RS Tipe D (Spesialis dasar)
- RS Tipe C (Spesialis lengkap)
- RS Tipe B (Sub-spesialis)
- RS Tipe A (Paling lengkap)

**Kebijakan Rujukan:**

**1. Wajib Lewati Faskes 1**
- Semua penyakit mulai di Faskes 1
- Dokter Faskes 1 akan menilai
- Jika perlu, akan dirujuk ke Faskes 2

**2. Rujukan Spesialis**
- Diberikan dokter Faskes 1
- Berlaku 30 hari
- Bisa dipakai di RS tujuan

**3. Rujukan Rawat Inap**
- Diberikan dokter Faskes 1
- Berlaku 30 hari
- Bisa dipakai di semua RS

**Pengecualian (Bisa Langsung Spesialis):**
- Rujukan Konseling Gizi
- Rujukan Psikolog
- Rujukan Dokter Gigi
- Kecelakaan Laka (IGD)
- Keadaan Darurat

**Cek Faskes 1 Anda:**
- Buka Mobile JKN
- Menu "Faskes" → "Faskes Saya"
- Akan muncul faskes 1 pilihan

**Ganti Faskes 1:**
- Via Mobile JKN (paling cepat)
- Datang ke kantor BPJS
- Efektif bulan depan`,
    faqs: [
      { question: 'Apa itu sistem tiering BPJS?', answer: 'Sistem berjenjang dimana pasien mulai berobat di Faskes 1 (Puskesmas/klinik), baru dirujuk ke Faskes 2 (RS) jika perlu.' },
      { question: 'Kapan boleh langsung ke spesialis tanpa rujukan?', answer: 'Untuk konseling gizi, psikolog, dokter gigi, kecelakaan laka, dan keadaan darurat. Selain itu WAJIB rujukan Faskes 1.' }
    ],
    keywords: 'faskes,tiering,berjenjang,rujukan,spesialis,puskesmas,rs',
    applicablePersonas: ['NEW_MEMBER', 'RELIABLE_PAYER'],
    priority: 9
  },
  {
    kbId: 'CLAIM_004',
    category: 'Klaim',
    subcategory: 'Rujukan',
    title: 'Surat Rujukan BPJS',
    summary: 'Panduan lengkap mengenai surat rujukan BPJS Kesehatan',
    detailContent: `Surat rujukan adalah dokumen penting untuk berobat ke Faskes 2 tingkat lanjut.

**Jenis Surat Rujukan:**

**1. Rujukan Poli Spesialis**
- Diberikan dokter Faskes 1
- Untuk berobat ke spesialis tertentu
- Contoh: Rujukan ke Poli Jantung, Poli Saraf
- Berlaku 30 hari

**2. Rujukan Rawat Inap**
- Diberikan dokter Faskes 1
- Untuk rawat inap di RS
- Berlaku 30 hari
- Bisa dipakai di semua RS

**3. Rujukan Pemeriksaan Khusus**
- Untuk CT-Scan, MRI, Endoscopy
- Diberikan dokter spesialis
- Berlaku 30 hari

**4. Rujukan Konsultasi Gizi**
- Boleh langsung ke ahli gizi
- Tanpa lewat Faskes 1

**Masa Berlaku Rujukan:**
- **Rujukan Poli:** 30 hari
- **Rujukan Rawat Inap:** 30 hari
- **Rujukan Kontrol:** Sesuai tanggal di surat

**Cek Rujukan Aktif:**
- Buka Mobile JKN
- Menu "Rujukan" → "Riwayat Rujukan"
- Lihat semua rujukan aktif

**Jika Rujukan Hilang/Kadaluarsa:**
- Kembali ke Faskes 1 pengirim
- Minta cetak rujukan baru
- Proses 1-2 hari

**Catatan Penting:**
- Bawa surat rujukan ASLI saat berobat
- Foto copy tidak diterima
- Rujukan tidak bisa dipindah ke orang lain`,
    faqs: [
      { question: 'Berapa lama surat rujukan BPJS berlaku?', answer: 'Surat rujukan poli spesialis dan rawat inap berlaku 30 hari dari tanggal terbit.' },
      { question: 'Bagaimana jika rujukan hilang?', answer: 'Kembali ke Faskes 1 pengirim rujukan, minta cetak ulang surat rujukan. Proses 1-2 hari.' }
    ],
    keywords: 'rujukan,surat,dokumen,berlaku,kadaluarsa,hilang,30 hari',
    applicablePersonas: ['NEW_MEMBER', 'RELIABLE_PAYER', 'FINANCIAL_STRUGGLE'],
    priority: 8
  },
  {
    kbId: 'CLAIM_005',
    category: 'Klaim',
    subcategory: 'Estimasi Biaya',
    title: 'Estimasi Biaya Klaim',
    summary: 'Cara mengecek estimasi biaya yang ditanggung BPJS',
    detailContent: `Sebelum tindakan medis, peserta bisa mengecek estimasi biaya yang ditanggung BPJS.

**Cara Cek Estimasi Biaya:**

**1. Via Mobile JKN**
- Buka aplikasi
- Menu "Estimasi Biaya"
- Pilih tindakan/operasi
- Pilih RS tujuan
- Estimasi akan muncul

**2. Tanya di RS**
- Sebelum tindakan, tanya ke administrasi RS
- Minta simulasi biaya BPJS
- RS bisa menghitung paket BPJS

**3. Via CS BPJS**
- Call 165
- Tanya estimasi tindakan
- Customer service bantu hitung

**Biaya yang Dijamin BPJS:**

**100% Ditanggung:**
- Rawat inap (kamar, makan, perawatan)
- Obat-obatan di RS
- Tindakan medis/operasi
- ICU/ICU (jika perlu)
- Konsultasi dokter
- Medical check-up terkait penyakit

**Tidak Ditanggung:**
- Obat racikan pulang (hanya 3 hari pertama)
- Alat kesehatan tertentu (kacamata, hearing aid)
- Kosmetik/estetik
- PGD (tidak emergency)

**Contoh Estimasi Biaya:**

**Operasi Usus Buntu:**
- Biaya normal: Rp15.000.000
- Ditanggung BPJS: 100% (Rp15.000.000)
- Peserta bayar: Rp0

**Persalinan Normal:**
- Biaya normal: Rp3.500.000
- Ditanggung BPJS: 100% (Rp3.500.000)
- Peserta bayar: Rp0

**Catatan:**
- Estimasi bisa berubah tergantung kondisi
- Pastikan RS menggunakan sistem BPJS
- Tanyakan detail biaya sebelum tindakan`,
    faqs: [
      { question: 'Bagaimana cara cek estimasi biaya BPJS?', answer: 'Via Mobile JKN (menu Estimasi Biaya), tanya langsung ke administrasi RS, atau call CS BPJS 165.' },
      { question: 'Apakah semua biaya rawat inap gratis?', answer: 'Ya, semua biaya rawat inap ditanggung 100% oleh BPJS (kamar, obat, tindakan, dokter) tanpa batas plafon.' }
    ],
    keywords: 'estimasi,biaya,klaim,tanggung,gratis,cek,hitung',
    applicablePersonas: ['RELIABLE_PAYER', 'NEW_MEMBER', 'FINANCIAL_STRUGGLE'],
    priority: 7
  },

  // ==================== TEKNIS APLIKASI (APP_XXX) ====================
  {
    kbId: 'APP_001',
    category: 'Teknis Aplikasi',
    subcategory: 'Mobile JKN',
    title: 'Download Mobile JKN',
    summary: 'Panduan mengunduh dan menginstall aplikasi Mobile JKN BPJS',
    detailContent: `Mobile JKN adalah aplikasi resmi BPJS Kesehatan untuk memudahkan peserta mengurus kepesertaan.

**Keuntungan Mobile JKN:**
✓ Cek status kepesertaan realtime
✓ Lihat riwayat pembayaran iuran
✓ Daftar antrian RS online
✓ Ganti Faskes 1 dengan mudah
✓ Chat dengan PANDAWA
✓ Lihat kartu BPJS digital
✓ Cek riwayat klaim

**Cara Download:**

**1. Android (Google Play Store)**
- Buka Play Store
- Cari: "Mobile JKN"
- Developer: BPJS Kesehatan
- Download & Install
- Ukuran: ~50MB

**2. iOS (App Store)**
- Buka App Store
- Cari: "Mobile JKN"
- Developer: BPJS Kesehatan
- Download & Install
- Ukuran: ~80MB

**3. Alternative Link:**
- Kunjungi: bpjs-kesehatan.go.id
- Klik menu "Mobile JKN"
- Pilih platform (Android/iOS)
- Redirect ke Play Store/App Store

**Cara Install:**
1. Download dari Play Store/App Store
2. Install seperti aplikasi biasa
3. Buka aplikasi
4. Izinkan akses kamera/storage (untuk kartu digital)
5. Login dengan nomor kartu BPJS

**Versi Minimum:**
- Android: 5.0 (Lollipop) ke atas
- iOS: 11.0 ke atas

**Pastikan download aplikasi RESMI dari BPJS Kesehatan!**`,
    faqs: [
      { question: 'Bagaimana cara download aplikasi Mobile JKN?', answer: 'Buka Play Store (Android) atau App Store (iOS), cari "Mobile JKN" dari developer BPJS Kesehatan, lalu install.' },
      { question: 'Apakah Mobile JKN gratis?', answer: 'Ya, aplikasi Mobile JKN gratis dan tidak ada biaya langganan. Download dan gunakan tanpa biaya.' }
    ],
    keywords: 'download,install,aplikasi,mobile jkn,android,ios,play store,app store',
    applicablePersonas: ['NEW_MEMBER', 'FORGETFUL_PAYER', 'RELIABLE_PAYER'],
    priority: 9
  },
  {
    kbId: 'APP_002',
    category: 'Teknis Aplikasi',
    subcategory: 'Login',
    title: 'Login Mobile JKN',
    summary: 'Panduan cara login ke aplikasi Mobile JKN BPJS',
    detailContent: `Setelah menginstall Mobile JKN, peserta perlu login untuk mengakses semua fitur.

**Cara Login Pertama Kali:**

**1. Buka Aplikasi Mobile JKN**
- Klik "Login" di halaman utama
- Pilih opsi login dengan **Nomor Kartu BPJS**

**2. Masukkan Nomor Kartu**
- Input 13 digit nomor kartu BPJS
- Contoh: 1234567890123

**3. Verifikasi Data**
- Sistem akan menampilkan nama peserta
- Pastikan nama sesuai dengan kartu
- Klik "Benar" jika data sesuai

**4. Buat Password/PIN**
- Buat password 6 digit
- Jangan sampai lupa!
- Gunakan kombinasi angka mudah diingat

**5. Selesaikan Registrasi**
- Login berhasil!
- Dashboard akan muncul

**Cara Login Berikutnya:**
- Buka aplikasi
- Input nomor kartu
- Input password/PIN
- Klik "Login"

**Lupa Password?**
- Klik "Lupa Password"
- Reset dengan nomor HP terdaftar
- Dapat OTP via SMS
- Buat password baru

**Fitur Setelah Login:**
- Kartu BPJS Digital
- Riwayat Pembayaran
- Daftar Antrian RS
- Ganti Faskes 1
- Chat PANDAWA
- Cek Status Kepesertaan

**Catatan:**
- Gunakan nomor kartu yang masih aktif
- Password harus 6 digit angka
- Jangan bagikan password ke orang lain`,
    faqs: [
      { question: 'Bagaimana cara login ke Mobile JKN?', answer: 'Buka aplikasi, klik Login, masukkan 13 digit nomor kartu BPJS, verifikasi nama, buat password 6 digit, selesai.' },
      { question: 'Apa yang harus dilakukan jika lupa password Mobile JKN?', answer: 'Klik "Lupa Password", reset dengan nomor HP terdaftar, dapat OTP via SMS, buat password baru.' }
    ],
    keywords: 'login,masuk,password,akun,mobile jkn,daftar,registrasi',
    applicablePersonas: ['NEW_MEMBER', 'FORGETFUL_PAYER'],
    priority: 9
  },
  {
    kbId: 'APP_003',
    category: 'Teknis Aplikasi',
    subcategory: 'Kartu Digital',
    title: 'Lihat Kartu Digital',
    summary: 'Cara mengakses dan menggunakan kartu BPJS digital di Mobile JKN',
    detailContent: `Kartu BPJS digital di Mobile JKN menggantikan kartu fisik untuk berobat.

**Keuntungan Kartu Digital:**
✓ Tidak perlu bawa kartu fisik
✓ Tidak perlu takut kartu hilang/rusak
✓ Selalu tersedia di HP
✓ Bisa di-screenshot untuk cadangan

**Cara Lihat Kartu Digital:**

**1. Login ke Mobile JKN**
- Gunakan nomor kartu dan password

**2. Buka Menu "Kartu Peserta"**
- Di dashboard, klik ikon kartu
- Kartu digital akan muncul
- Tampilkan nama, nomor kartu, kelas, faskes

**3. Screenshot Kartu**
- Untuk cadangan, screenshot kartu digital
- Simpan di galeri HP
- Bisa ditampilkan saat berobat

**Cara Menggunakan Kartu Digital:**

**Saat Berobat:**
1. Buka Mobile JKN
2. Tampilkan menu "Kartu Peserta"
3. Tunjukkan ke petugas RS/Puskesmas
4. Petugas akan memindai QR code pada kartu digital
5. Verifikasi selesai!

**Alternatif:**
- Screenshot kartu digital
- Simpan di galeri
- Tunjukkan screenshot saat berobat
- Valid sama dengan kartu fisik

**Info di Kartu Digital:**
- Nama peserta
- Nomor kartu (13 digit)
- Kelas rawat (1/2/3)
- Faskes 1 terdaftar
- Status kepesertaan (Aktif/Tidak Aktif)
- Masa berlaku kartu

**Catatan Penting:**
- Kartu digital SAMA LEGALNYA dengan kartu fisik
- Semua faskes wajib menerima kartu digital
- QR code unique per kartu
- Jangan bagikan screenshot ke orang lain`,
    faqs: [
      { question: 'Bagaimana cara melihat kartu BPJS digital?', answer: 'Login ke Mobile JKN, klik menu "Kartu Peserta", kartu digital akan muncul dengan nama, nomor kartu, kelas, dan faskes.' },
      { question: 'Apakah kartu digital bisa digunakan untuk berobat?', answer: 'Ya, kartu digital SAMA LEGALNYA dengan kartu fisik. Semua faskes wajib menerima kartu digital BPJS.' }
    ],
    keywords: 'kartu digital,digital card,mobile jkn,qr code,screenshot',
    applicablePersonas: ['NEW_MEMBER', 'RELIABLE_PAYER', 'FORGETFUL_PAYER'],
    priority: 8
  },
  {
    kbId: 'APP_004',
    category: 'Teknis Aplikasi',
    subcategory: 'Riwayat',
    title: 'Riwayat Iuran',
    summary: 'Cara mengecek riwayat pembayaran iuran BPJS di Mobile JKN',
    detailContent: `Melacak riwayat pembayaran iuran penting untuk memastikan kepesertaan tetap aktif.

**Cara Lihat Riwayat Iuran:**

**1. Via Mobile JKN**
- Buka aplikasi
- Login dengan nomor kartu
- Klik menu "Riwayat Pembayaran"
- Semua riwayat akan muncul:
  * Tanggal bayar
  * Bulan iuran yang dibayar
  * Jumlah yang dibayar
  * Status pembayaran

**2. Via Website BPJS**
- Kunjungi bpjs-kesehatan.go.id
- Login dengan nomor kartu
- Klik "Riwayat Iuran"
- Download/Print riwayat

**3. Via Kantor BPJS**
- Datang ke kantor cabang
- Bawa KTP + kartu BPJS
- Minta cetak riwayat pembayaran
- Gratis

**Informasi di Riwayat Iuran:**
- **Tanggal Bayar:** Kapan pembayaran dilakukan
- **Periode:** Bulan iuran yang dibayar
- **Jumlah:** Nominal yang dibayar
- **Status:** Lunas/Belum Lunas
- **Channel:** Metode pembayaran (ATM, Minimarket, dll)
- **Kelas:** Kelas rawat saat itu

**Cek Tunggakan:**
- Di menu Riwayat, ada ringkasan tunggakan
- Atau chat PANDAWA: "TAGIHAN SAYA"
- Sistem akan hitung total tunggakan + denda

**Download Bukti Pembayaran:**
- Pilih bulan yang diinginkan
- Klik "Download Bukti Bayar"
- Simpan PDF
- Bisa untuk keperluan administrasi

**Catatan:**
- Riwayat tersedia selama kepesertaan aktif
- Segera hubungi CS jika ada pembayaran yang tidak tercatat
- Simpan bukti bayar dari channel pembayaran`,
    faqs: [
      { question: 'Bagaimana cara cek riwayat pembayaran iuran BPJS?', answer: 'Via Mobile JKN (menu Riwayat Pembayaran), website bpjs-kesehatan.go.id, atau datang ke kantor BPJS untuk cetak riwayat.' },
      { question: 'Apakah bisa download bukti pembayaran dari Mobile JKN?', answer: 'Ya, di menu Riwayat Pembayaran, pilih bulan yang diinginkan, klik "Download Bukti Bayar" untuk dapat PDF.' }
    ],
    keywords: 'riwayat,iuran,pembayaran,history,lunas,tunggakan,bukti',
    applicablePersonas: ['RELIABLE_PAYER', 'FORGETFUL_PAYER', 'FINANCIAL_STRUGGLE'],
    priority: 7
  },
  {
    kbId: 'APP_005',
    category: 'Teknis Aplikasi',
    subcategory: 'Antrian RS',
    title: 'Daftar Antrian RS',
    summary: 'Panduan pendaftaran antrian rawat jalan RS lewat Mobile JKN',
    detailContent: `Mobile JKN menyediakan fitur **Antrian RS Online** untuk menghindari antre lama di rumah sakit.

**Keuntungan Antrian Online:**
✓ Tidak perlu datang pagi untuk ngantri
✓ Tahu jadwal temu sebelumnya
✓ Bisa pilih dokter dan jam praktik
✓ Hemat waktu dan tenaga

**Cara Daftar Antrian RS:**

**1. Buka Mobile JKN**
- Login dengan nomor kartu

**2. Pilih Menu "Antrian RS"**
- Klik icon "Buat Janji"
- Pilih polly/spesialis yang dicari

**3. Pilih RS Tujuan**
- Pilih RS rujukan
- Pilih polly yang dituju
- Pilih dokter (jika ada pilihan)
- Pilih tanggal dan jam praktik

**4. Konfirmasi Pendaftaran**
- Cek kembali jadwal
- Klik "Daftar"
- Dapat nomor antrian dan jadwal temu

**5. Datang ke RS**
- Sesuai jadwal temu
- Bawa kartu BPJS
- Lapor ke loket pendaftaran
- Tunjukkan bukti daftar antrian

**Syarat Daftar Antrian Online:**
- Punya surat rujukan dari Faskes 1
- Kepesertaan harus AKTIF
- RS harus punya polly yang dicari
- Daftar H-1 atau H-day sebelum jam praktik

**Poli yang Bisa Didaftarkan:**
- Poli Penyakit Dalam
- Poli Anak
- Poli Bedah
- Poli Mata
- Poli THT
- Poli Syaraf
- Dan lain-lain

**Cek Jadwal Dokter:**
- Di menu Antrian RS
- Pilih RS
- Semua jadwal dokter akan muncul
- Pilih sesuai kebutuhan

**Batalkan Antrian:**
- Jika tidak bisa datang
- Buka menu "Riwayat Antrian"
- Klik "Batal"
- Gratis tanpa denda

**Catatan:**
- Daftar maksimal H-3 sebelum tanggal periksa
- Pastikan bawa rujukan asli saat datang
- Datang 30 menit sebelum jadwal`,
    faqs: [
      { question: 'Bagaimana cara daftar antrian RS lewat Mobile JKN?', answer: 'Login ke Mobile JKN, pilih menu "Antrian RS", pilih RS dan polly tujuan, pilih dokter dan jadwal, konfirmasi pendaftaran.' },
      { question: 'Apakah bisa membatalkan antrian yang sudah terdaftar?', answer: 'Ya, buka menu "Riwayat Antrian", pilih antrian yang ingin dibatalkan, klik "Batal". Gratis tanpa denda.' }
    ],
    keywords: 'antrian,rs,daftar,janji,jadwal,dokter,poli,online',
    applicablePersonas: ['RELIABLE_PAYER', 'FORGETFUL_PAYER', 'NEW_MEMBER'],
    priority: 8
  },

  // ==================== KEBIJAKAN (POLICY_XXX) ====================
  {
    kbId: 'POLICY_001',
    category: 'Kebijakan',
    subcategory: 'Kenaikan Iuran',
    title: 'Kenaikan Iuran BPJS',
    summary: 'Informasi kebijakan kenaikan iuran BPJS Kesehatan',
    detailContent: `Pemerintah secara berkala meninjau dan menyesuaikan iuran BPJS Kesehatan untuk menjaga keberlanjutan program.

**Kebijakan Terbaru:**

**Iuran Peserta Mandiri:**
- Kelas 1: Rp150.000/bulan
- Kelas 2: Rp100.000/bulan
- Kelas 3: Rp35.000/bulan (ditanggung pemerintah Rp7.000, peserta bayar Rp16.500)
- **SUDAH TIDAK ADA KENAIKAN LAGI (Perpres 2024)**

**Peserta PBI:**
- Gratis (ditanggung pemerintah 100%)
- Tidak ada iuran bulanan

**Peserta Pekerja:**
- Iuran ditanggung perusahaan (5% dari gaji)
- Peserta bayar 1% + perusahaan 4%

**Alasan Penyesuaian Iuran:**
- Inflasi biaya kesehatan
- Peningkatan layanan kesehatan
- Kenaikan biaya obat dan alat medis
- Pemerataan akses kesehatan

**Kebijakan Kelas Rawat:**
- Kelas 1, 2, 3 tetap tersedia
- Peserta bisa ganti kelas kapan saja
- Iuran menyesuaikan kelas

**Subsidi Pemerintah:**
- PBI APBN: Peserta sangat miskin
- PBI APBD: Peserta miskin daerah
- Dukungan daftar tunggakan

**Cek Iuran Terbaru:**
- Chat PANDAWA: "IURAN KELAS [kelas]"
- Atau buka Mobile JKN

**Catatan:**
- Iuran tidak akan naik lagi di masa mendatang
- Pemerintah menjamin keberlanjutan JKN
- Fokus pada peningkatan layanan`,
    faqs: [
      { question: 'Apakah iuran BPJS akan naik lagi?', answer: 'TIDAK, menurut Perpres 2024, iuran BPJS sudah final dan tidak akan ada kenaikan lagi untuk masa mendatang.' },
      { question: 'Berapa iuran BPJS per kelas?', answer: 'Kelas 1: Rp150.000, Kelas 2: Rp100.000, Kelas 3: Rp16.500 (setelah subsidi pemerintah).' }
    ],
    keywords: 'kenaikan,iuran,biaya,kenaikan,harga,baru,kebijakan',
    applicablePersonas: ['RELIABLE_PAYER', 'FINANCIAL_STRUGGLE', 'NEW_MEMBER'],
    priority: 6
  },
  {
    kbId: 'POLICY_002',
    category: 'Kebijakan',
    subcategory: 'Jaminan',
    title: 'Jaminan Pemeliharaan Kesehatan',
    summary: 'Layanan kesehatan yang dijamin BPJS Kesehatan',
    detailContent: `BPJS Kesehatan menjamin pemeliharaan kesehatan peserta secara menyeluruh dan tanpa batas plafon.

**Layanan yang Dijamin:**

**1. Pelayanan Promotif Preventif**
- Penyuluhan kesehatan
- Imunisasi dasar
- KB (Keluarga Berencana)
- Pemeriksaan kesehatan rutin

**2. Pelayanan Rawat Jalan Tingkat Pertama**
- Puskesmas
- Klinik Pratama
- Dokter Umum
- Dokter Gigi
- Obat-obatan

**3. Pelayanan Rawat Jalan Tingkat Lanjut**
- Poliklinik spesialis RS
- Tindakan medis spesialis
- Konsultasi sub-spesialis
- Rehabilitasi medis

**4. Pelayanan Rawat Inap**
- Kamar rawat inap
- Makan pasien
- Perawatan intensif (ICU/HCU)
- Tindakan operasi
- Obat-obatan selama rawat inap
- Kunjungan dokter
- Tindakan penunjang (Lab, X-Ray, CT-Scan, MRI)

**Tidak Ditanggung:**
- Obat racikan pulang (hanya 3 hari pertama)
- Alat kesehatan tertentu (kacamata, hearing aid)
- Kosmetik dan estetik
- Penyakit yang tidak sesuai prosedur
- PGD (Pelayanan Gawat Darurat) non-urgent

**Plafon (Batas Biaya):**
- **TIDAK ADA BATAS PLAFON**
- Semua penyakit ditanggung 100%
- Termasuk penyakit kronis dan kanker
- Unlimited seumur hidup

**Cakupan Seluruh Indonesia:**
- Berlaku di semua provinsi
- Bisa berobat di seluruh Indonesia
- Pindah provinsi tetap ditanggung
- Kartu BPJS nasional

**Catatan:**
- Baca prosedur berobat dengan benar
- Ikuti alur rujukan yang ditentukan
- Tanyakan ke BPJS jika ada yang tidak jelas`,
    faqs: [
      { question: 'Apa saja layanan yang dijamin BPJS Kesehatan?', answer: 'Rawat jalan, rawat inap, obat-obatan, operasi, ICU, pemeriksaan penunjang (Lab, CT-Scan), rehabilitasi, promotif preventif. Semua ditanggung 100%.' },
      { question: 'Apakah ada batas plafon klaim BPJS?', answer: 'TIDAK ADA batas plafon. Semua penyakit ditanggung 100% tanpa batas biaya, seumur hidup.' }
    ],
    keywords: 'jaminan,layanan,ditanggung,plafon,batas,gratis,promo,preventif',
    applicablePersonas: ['NEW_MEMBER', 'RELIABLE_PAYER'],
    priority: 9
  },
  {
    kbId: 'POLICY_003',
    category: 'Kebijakan',
    subcategory: 'Hak Kewajiban',
    title: 'Hak dan Kewajiban Peserta',
    summary: 'Hak dan kewajiban peserta BPJS Kesehatan',
    detailContent: `Setiap peserta BPJS memiliki hak dan kewajiban yang harus dipahami.

**Hak Peserta:**

**1. Jaminan Kesehatan**
- Mendapatkan pelayanan kesehatan dasar
- Mendapatkan pelayanan kesehatan spesialis
- Mendapatkan pelayanan rawat inap
- Tanpa batas plafon

**2. Informasi**
- Mendapatkan informasi jaminan kesehatan
- Mendapatkan penjelasan prosedur berobat
- Mengakses informasi kepesertaan

**3. Pelayanan yang Sama**
- Tidak ada diskriminasi
- Dipandu sesuai aturan
- Dilayani dengan baik

**4. Pengaduan**
- Menyampaikan keluhan
- Meminta klarifikasi
- Mendapatkan respon

**Kewajiban Peserta:**

**1. Membayar Iuran**
- Setiap bulan tepat waktu
- Sebelum tanggal 10
- Sesuai kelas rawat

**2. Mematuhi Aturan**
- Mengikuti alur berobat (tiering)
- Membawa kartu saat berobat
- Memberi informasi yang jujur

**3. Menjaga Kartu**
- Menjaga kerahasiaan data
- Tidak meminjamkan kartu
- Melaporkan jika hilang

**4. Tidak Menyalahgunakan**
- Tidak meminjamkan kartu ke orang lain
- Tidak melakukan penipuan jaminan
- Tidak memanipulasi data

**Sanksi Jika Melanggar:**
- Kepesertaan dibekukan
- Tidak bisa berobat dengan BPJS
- Ganti rugi kerugian negara
- Bisa dikenakan pasal penipuan

**Layanan Pengaduan:**
- Call Center 165
- Chat PANDAWA
- Kantor BPJS terdekat

**Catatan:**
- Hak dan kewajiban berlaku sejak terdaftar
- Pelanggaran serius bisa dikenakan sanksi hukum
- Gunakan hak dengan bijak`,
    faqs: [
      { question: 'Apa saja hak peserta BPJS?', answer: 'Jaminan kesehatan penuh, informasi jaminan, pelayanan tanpa diskriminasi, dan hak menyampaikan pengaduan.' },
      { question: 'Apa kewajiban peserta BPJS?', answer: 'Membayar iuran setiap bulan tepat waktu, mematuhi aturan berobat, menjaga kerahasiaan kartu, dan tidak menyalahgunakan jaminan.' }
    ],
    keywords: 'hak,kewajiban,peserta,aturan,wajib,sanksi,pelanggaran',
    applicablePersonas: ['NEW_MEMBER', 'RELIABLE_PAYER'],
    priority: 8
  },
  {
    kbId: 'POLICY_004',
    category: 'Kebijakan',
    subcategory: 'Sanksi',
    title: 'Sanksi Administratif',
    summary: 'Sanksi administratif bagi peserta yang melanggar ketentuan BPJS',
    detailContent: `BPJS Kesehatan menerapkan sanksi administratif untuk peserta yang melanggar ketentuan.

**Jenis Pelanggaran dan Sanksi:**

**1. Tidak Membayar Iuran**
- **Pelanggaran:** Telat bayar > 1 bulan
- **Sanksi:**
  - Denda 2% per bulan
  - Tidak bisa berobat saat status tidak aktif
  - Harus lunasi tunggakan untuk reaktivasi

**2. Meminjamkan Kartu ke Orang Lain**
- **Pelanggaran:** Meminjamkan kartu untuk berobat
- **Sanksi:**
  - Kepesertaan dibekukan 6 bulan
  - Tidak bisa berobat dengan BPJS
  - Wajib bayar biaya pengobatan yang sudah dipakai

**3. Memanipulasi Data**
- **Pelanggaran:** Mengubah data kepesertaan
- **Sanksi:**
  - Kepesertaan dibekukan 12 bulan
  - Dikenakan pasal penipuan
  - Bisa dipidana

**4. Penipuan Jaminan**
- **Pelanggaran:** Mengklaim biaya palsu
- **Sanksi:**
  - Kepesertaan dibekukan permanen
  - Ganti rugi kerugian negara
  - Dipidana sesuai UU

**5. Tidak Mematuhi Prosedur Berobat**
- **Pelanggaran:** Berobat tidak sesuai aturan
- **Sanksi:**
  - Biaya pengobatan ditanggung sendiri
  - Tidak bisa klaim ke BPJS

**Proses Sanksi:**
1. Bukti pelanggaran dikumpulkan
2. Surat peringatan dikirim
3. Peserta diberi kesempatan klarifikasi
4. Keputusan sanksi ditetapkan
5. Sanksi diberlakukan

**Pengajuan Keberatan:**
- Peserta bisa mengajukan keberatan
- Tulis keberatan tertulis
- Serahkan ke kantor BPJS
- Proses 14-30 hari

**Catatan:**
- Sanksi untuk menjaga keadilan
- Peserta lain berhak dilayani dengan baik
- Jangan menyalahgunakan jaminan kesehatan`,
    faqs: [
      { question: 'Apa sanksi jika meminjamkan kartu BPJS ke orang lain?', answer: 'Kepesertaan dibekukan 6 bulan, tidak bisa berobat dengan BPJS, dan wajib mengembalikan biaya pengobatan yang sudah dipakai.' },
      { question: 'Apakah ada sanksi jika telat bayar iuran?', answer: 'Ya, denda 2% per bulan dan kepesertaan tidak aktif sehingga tidak bisa berobat sampai lunasi tunggakan.' }
    ],
    keywords: 'sanksi,pelanggaran,hukuman,pidana,bekukan,keberatan',
    applicablePersonas: ['NEW_MEMBER', 'RELIABLE_PAYER'],
    priority: 7
  },

  // ==================== PROGRAM KHUSUS (REHAB_XXX) ====================
  {
    kbId: 'REHAB_001',
    category: 'Program Khusus',
    subcategory: 'Rehabilitasi',
    title: 'Program Rehabilitasi Tunggakan',
    summary: 'Program untuk peserta yang memiliki tunggakan iuran BPJS',
    detailContent: `BPJS menyediakan program rehabilitasi untuk peserta yang memiliki tunggakan iuran.

**Apa itu Rehabilitasi Tunggakan?**
Program untuk membantu peserta dengan tunggakan besar agar bisa:
- Mengaktifkan kembali kepesertaan
- Mencicil tunggakan dengan ringan
- Kembali mendapatkan jaminan kesehatan

**Kategori Peserta yang Bisa Rehab:**
1. Tunggakan 3-6 bulan
2. Tunggakan 6-12 bulan
3. Tunggakan 12-24 bulan
4. Tunggakan > 24 bulan

**Syarat Mengikuti Rehab:**
- Punya tunggakan iuran
- Belum pernah mengikuti rehab sebelumnya
- Bersih dari pidana penipuan BPJS
- Membuat pernyataan tidak akan menunggak lagi

**Keuntungan Program Rehab:**
✓ Cicilan tunggakan hingga 24 bulan
✓ Bebas denda selama masa cicilan
✓ Kepesertaan langsung aktif
✓ Bisa berobat dengan BPJS selama rehab
✓ Ringan dan terjangkau

**Contoh Skema Cicilan:**

**Tunggakan 12 Bulan (Rp420.000):**
- Tanpa rehab: Rp420.000 lunas di depan
- Dengan rehab: Rp17.500/bulan selama 24 bulan

**Tunggakan 24 Bulan (Rp840.000):**
- Tanpa rehab: Rp840.000 + denda
- Dengan rehab: Rp35.000/bulan selama 24 bulan

**Cara Daftar Rehab:**
1. Datang ke kantor BPJS
2. Bawa KTP + kartu BPJS
3. Isi form permohonan rehab
4. Tunggu persetujuan (7 hari kerja)
5. Tandatangani perjanjian cicilan
6. Mulai cicil bulan depan

**Catatan:**
- Program rehab terbatas per periode
- Segera daftar sebelum kuota habis
- Jangan menunggak lagi selama rehab`,
    faqs: [
      { question: 'Apa itu program rehabilitasi tunggakan BPJS?', answer: 'Program untuk peserta dengan tunggakan agar bisa mencicil tunggakan hingga 24 bulan, bebas denda, dan kepesertaan aktif kembali.' },
      { question: 'Bagaimana cara daftar program rehabilitasi?', answer: 'Datang ke kantor BPJS dengan KTP dan kartu BPJS, isi form permohonan rehab, tunggu persetujuan 7 hari, tandatangani perjanjian cicilan.' }
    ],
    keywords: 'rehab,rehabilitasi,tunggakan,cicilan,program,bantuan',
    applicablePersonas: ['FINANCIAL_STRUGGLE', 'FORGETFUL_PAYER'],
    priority: 10
  },
  {
    kbId: 'REHAB_002',
    category: 'Program Khusus',
    subcategory: 'Syarat',
    title: 'Syarat Rehabilitasi',
    summary: 'Syarat dan ketentuan mengikuti program rehabilitasi tunggakan',
    detailContent: `Untuk mengikuti program rehabilitasi tunggakan, peserta harus memenuhi syarat tertentu.

**Syarat Umum:**
1. Peserta mandiri (bukan PBI)
2. Memiliki tunggakan iuran
3. Kepesertaan tidak aktif karena tunggakan
4. Belum pernah mengikuti rehab sebelumnya
5. Tidak sedang dalam proses hukum

**Syarat Administratif:**
- **KTP Asli + FC**
- **Kartu BPJS Asli + FC**
- **Kartu Keluarga (KK)**
- **Form Permohonan Rehab** (isi di kantor)
- **Surat Pernyataan** tidak akan menunggak lagi

**Kategori yang Boleh Rehab:**

**Boleh Rehab:**
- Tunggakan karena lupa bayar
- Tunggakan karena kesulitan finansial sementara
- Tunggakan karena PHK (dengan surat keterangan)
- Tunggakan karena sakit panjang (dengan surat dokter)

**Tidak Boleh Rehab:**
- Tunggakan karena menolak bayar (sengaja)
- Pernah melakukan penipuan BPJS
- Sedang dalam proses pidana
- Peserta PBI (gratis, tidak ada tunggakan)

**Batas Waktu Tunggakan:**
- Minimal: 3 bulan tunggakan
- Maksimal: 48 bulan tunggakan
- Di atas 48 bulan: perlu penilaian khusus

**Persyaratan Finansial:**
- Mampu membayar iuran bulanan (Rp35.000-Rp150.000)
- Mampu membayar cicilan tunggakan
- Memiliki penghasilan tetap (dibuktikan)

**Proses Verifikasi:**
1. Submit semua dokumen
2. BPJS verifikasi data
3. BPJS tinjau kemampuan bayar
4. Keputusan dalam 7 hari kerja

**Jika Ditolak:**
- Minta surat penolakan tertulis
- Ajukan keberatan jika ada kesalahan
- Atau bayar tunggakan langsung

**Catatan:**
- Lengkapi semua dokumen sebelum datang
- Pastikan data yang diisi benar
- Jangan mencoba memalsukan dokumen`,
    faqs: [
      { question: 'Apa syarat mengikuti program rehabilitasi tunggakan?', answer: 'Peserta mandiri, ada tunggakan, tidak aktif, belum pernah rehab, KTP + kartu BPJS + KK, form permohonan, surat pernyataan.' },
      { question: 'Berapa lama tunggakan agar boleh mengikuti rehab?', answer: 'Minimal 3 bulan tunggakan, maksimal 48 bulan. Di atas 48 bulan perlu penilaian khusus.' }
    ],
    keywords: 'syarat,ketentuan,persyaratan,dokumen,rehab,verifikasi',
    applicablePersonas: ['FINANCIAL_STRUGGLE'],
    priority: 9
  },
  {
    kbId: 'REHAB_003',
    category: 'Program Khusus',
    subcategory: 'Cicilan',
    title: 'Cicilan Tunggakan',
    summary: 'Panduan pembayaran cicilan tunggakan iuran BPJS',
    detailContent: `Setelah disetujui mengikuti program rehabilitasi, peserta akan mendapatkan skema cicilan.

**Skema Cicilan:**

**Pilihan Tenor:**
- 12 bulan (cicilan lebih besar)
- 18 bulan (cicilan sedang)
- 24 bulan (cicilan paling kecil)

**Perhitungan Cicilan:**

Contoh: Tunggakan 12 bulan (Rp420.000)

| Tenor | Cicilan/Bulan | Total Bayar |
|-------|--------------|-------------|
| 12 bulan | Rp35.000 | Rp420.000 |
| 18 bulan | Rp23.500 | Rp423.000 |
| 24 bulan | Rp17.500 | Rp420.000 |

**Cara Membayar Cicilan:**

**1. Bayar Iuran Bulanan (Wajib)**
- Bayar iuran normal setiap bulan
- Contoh: Kelas 3 = Rp35.000/bulan
- Bayar tanggal 1-10

**2. Bayar Cicilan Tunggakan (Wajib)**
- Bayar di atas iuran bulanan
- Contoh: Cicilan = Rp17.500/bulan
- Total bayar per bulan = Rp35.000 + Rp17.500 = Rp52.500

**Channel Pembayaran:**
- ATM/Internet Banking
- Minimarket (Indomaret, Alfamart)
- Mobile Banking
- E-Commerce (Tokopedia, Shopee)
- Kantor Pos

**Cek Status Cicilan:**
- Chat PANDAWA: "STATUS REHAB"
- Atau buka Mobile JKN

**Jika Telat Bayar Cicilan:**
- Denda 2% dari cicilan
- Program rehab bisa dibatalkan
- Kembali ke status tunggakan

**Lunas Sebelum Tenor:**
- Boleh lunasi kapan saja
- Tidak ada denda pelunasan cepat
- Chat PANDAWA: "LUNASIN REHAB"

**Catatan:**
- Jangan pernah telat bayar cicilan
- Program rehab hanya sekali seumur hidup
- Lunasi secepat mungkin jika memungkinkan`,
    faqs: [
      { question: 'Bagaimana cara membayar cicilan rehabilitasi BPJS?', answer: 'Bayar iuran bulanan normal + cicilan tunggakan setiap bulan di channel pembayaran biasa (ATM, minimarket, e-commerce).' },
      { question: 'Berapa cicilan rehabilitasi BPJS?', answer: 'Tergantung tunggakan dan tenor. Contoh tunggakan 12 bulan (Rp420.000): tenor 24 bulan = cicilan Rp17.500/bulan.' }
    ],
    keywords: 'cicilan,bayar,tunggakan,rehab,tenor,lunas',
    applicablePersonas: ['FINANCIAL_STRUGGLE'],
    priority: 9
  },
  {
    kbId: 'REHAB_004',
    category: 'Program Khusus',
    subcategory: 'Biaya',
    title: 'Biaya Administrasi Rehabilitasi',
    summary: 'Informasi biaya administrasi program rehabilitasi tunggakan',
    detailContent: `Salah satu keuntungan program rehabilitasi adalah **bebas biaya administrasi**.

**Biaya-Biaya dalam Program Rehab:**

**Gratis (Tidak Ada Biaya):**
✓ Pendaftaran program rehab
✓ Administrasi pengajuan
✓ Proses verifikasi
✓ Pembuatan perjanjian cicilan
✓ Aktivasi kembali kepesertaan
✓ Penghapusan denda keterlambatan

**Satu-Satunya Biaya:**
- **Cicilan tunggakan** (sesuai skema)
- **Iuran bulanan** (normal seperti biasa)

**Perbandingan:**

**Tanpa Rehab:**
- Tunggakan: 12 bulan (Rp420.000)
- Denda: 12 x 2% x Rp35.000 = Rp84.000
- **Total bayar: Rp504.000** (lunas di depan)

**Dengan Rehab:**
- Bebas biaya admin: Rp0
- Bebas denda: Rp0
- Cicilan 24 bulan: Rp17.500 x 24 = Rp420.000
- **Total bayar: Rp420.000** (bisa dicicil)

**Hemat: Rp84.000 + bisa dicicil!**

**Kenapa Gratis?**
- Pemerintah ingin peserta kembali aktif
- Program untuk membantu, bukan menguntungkan
- Fokus pada keberlanjutan JKN

**Cek Total Tunggakan:**
- Chat PANDAWA: "TAGIHAN SAYA"
- Dapatkan rincian:
  * Jumlah bulan tunggakan
  * Total iuran
  * Total denda (yang akan dihapus)
  * Suggestion skema rehab

**Tips:**
- Segera daftar rehab saat masih ada kuota
- Semakin lama menunggak, semakin besar cicilan
- Rehab hanya sekali seumur hidup

**Catatan:**
- Program rehab bisa berakhir sewaktu-waktu
- Manfaatkan sekarang sebelum terlambat
- Jangan menunggak lagi setelah rehab`,
    faqs: [
      { question: 'Apakah ada biaya administrasi program rehabilitasi?', answer: 'TIDAK ADA. Program rehab gratis pendaftaran, administrasi, verifikasi, dan bebas denda keterlambatan.' },
      { question: 'Berapa hematnya mengikuti program rehab?', answer: 'Contoh tunggakan 12 bulan: tanpa rehab bayar Rp504.000 (lunas di depan), dengan rehab cuma Rp420.000 (bisa dicicil 24 bulan).' }
    ],
    keywords: 'biaya,admin,administrasi,gratis,bebas,denda,hemat',
    applicablePersonas: ['FINANCIAL_STRUGGLE', 'FORGETFUL_PAYER'],
    priority: 8
  }
]

export async function POST(request: NextRequest) {
  try {
    console.log('🌱 Starting PANDAWA KB seeding...')

    let createdCount = 0
    let skippedCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const entry of PANDAWA_KB_ENTRIES) {
      try {
        // Check if kbId already exists (idempotency)
        const [existing] = await db
          .select()
          .from(pandawaKnowledgeBase)
          .where(eq(pandawaKnowledgeBase.kbId, entry.kbId))
          .limit(1)

        if (existing) {
          console.log(`⏭️  Skipping existing KB ID: ${entry.kbId}`)
          skippedCount++
          continue
        }

        // Insert new KB entry
        await db.insert(pandawaKnowledgeBase).values({
          kbId: entry.kbId,
          category: entry.category,
          subcategory: entry.subcategory || null,
          title: entry.title,
          summary: entry.summary,
          detailContent: entry.detailContent,
          faqs: entry.faqs || null,
          keywords: entry.keywords || null,
          priority: entry.priority || 0,
          applicablePersonas: entry.applicablePersonas || null,
          lastVerified: new Date(),
          version: 1,
          isActive: true,
          publishedAt: new Date(),
        })

        console.log(`✅ Created KB entry: ${entry.kbId} - ${entry.title}`)
        createdCount++

      } catch (error: any) {
        console.error(`❌ Error inserting KB entry ${entry.kbId}:`, error)
        errorCount++
        errors.push(`${entry.kbId}: ${error.message}`)
      }
    }

    const summary = {
      total: PANDAWA_KB_ENTRIES.length,
      created: createdCount,
      skipped: skippedCount,
      errors: errorCount,
      errorDetails: errors,
      timestamp: new Date().toISOString()
    }

    console.log('🎉 PANDAWA KB seeding completed:', summary)

    return NextResponse.json({
      success: true,
      message: `Seeding completed. Created: ${createdCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
      data: summary
    })

  } catch (error: any) {
    console.error('💥 Fatal error during PANDAWA KB seeding:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 })
  }
}

// GET endpoint to check existing KB entries
export async function GET(request: NextRequest) {
  try {
    const entries = await db
      .select()
      .from(pandawaKnowledgeBase)
      .orderBy(pandawaKnowledgeBase.category)

    return NextResponse.json({
      success: true,
      count: entries.length,
      data: entries
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
