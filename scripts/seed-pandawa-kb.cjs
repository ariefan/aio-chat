const { Client } = require('pg');
const dotenv = require('dotenv');

// PANDAWA Knowledge Base Entries - 33 structured entries
const PANDAWA_KB_ENTRIES = [
  // ==================== PEMBAYARAN (PAY_XXX) ====================
  {
    kb_id: 'PAY_001',
    category: 'Pembayaran',
    subcategory: 'Metode Pembayaran',
    title: 'Cara Pembayaran Iuran BPJS',
    summary: 'Berbagai metode pembayaran iuran BPJS Kesehatan yang mudah dan terjangkau',
    detail_content: `Iuran BPJS Kesehatan dapat dibayar melalui berbagai channel:

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
    applicable_personas: ['FORGETFUL_PAYER', 'FINANCIAL_STRUGGLE', 'RELIABLE_PAYER'],
    priority: 10
  },
  {
    kb_id: 'PAY_002',
    category: 'Pembayaran',
    subcategory: 'Virtual Account',
    title: 'Virtual Account Bank BPJS',
    summary: 'Panduan pembayaran iuran melalui Virtual Account berbagai bank nasional',
    detail_content: `Setiap peserta BPJS Kesehatan memiliki nomor Virtual Account (VA) unik untuk pembayaran iuran.

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
    applicable_personas: ['FORGETFUL_PAYER', 'RELIABLE_PAYER'],
    priority: 9
  },
  {
    kb_id: 'PAY_003',
    category: 'Pembayaran',
    subcategory: 'Minimarket',
    title: 'Pembayaran via Minimarket',
    summary: 'Panduan pembayaran iuran BPJS di Indomaret, Alfamart, dan Alfamidi',
    detail_content: `Pembayaran iuran BPJS Kesehatan dapat dilakukan di minimarket terdekat:

**Syarat Pembayaran:**
- Nomor kartu BPJS (13 digit)
- Jumlah iuran sesuai kelas:
  * Kelas 1: Rp150.000
  * Kelas 2: Rp100.000
  * Kelas 3: Rp35.000

**Langkah Pembayaran:**
1. Datang ke kasier minimarket
2. Sampaikan ingin membayar iuran BPJS
3. Tunjukkan nomor kartu BPJS
4. Sebutkan jumlah bulan yang ingin dibayar
5. Bayar iuran + biaya admin (Rp2.500 - Rp5.000)
6. Simpan struk bukti pembayaran

**Tips:**
- Pembayaran bisa untuk beberapa bulan sekaligus
- Simpan struk sebagai bukti jika terjadi kesalahan`,
    faqs: [
      { question: 'Berapa biaya admin di minimarket?', answer: 'Biaya admin di minimarket berkisar Rp2.500 - Rp5.000 per transaksi.' },
      { question: 'Bisa bayar untuk berapa bulan?', answer: 'Bisa membayar untuk 1-12 bulan sekaligus di minimarket.' }
    ],
    keywords: 'minimarket,indomaret,alfamart,alfamidi,bayar,struk',
    applicable_personas: ['FORGETFUL_PAYER', 'FINANCIAL_STRUGGLE'],
    priority: 8
  },
  {
    kb_id: 'PAY_004',
    category: 'Pembayaran',
    subcategory: 'Autodebet',
    title: 'Autodebet BPJS',
    summary: 'Panduan setting autodebet otomatis untuk pembayaran iuran BPJS',
    detail_content: `Autodebet adalah layanan pembayaran otomatis iuran BPJS setiap bulan.

**Jenis Autodebet:**
1. **Autodebet Kartu Kredit**
   - Potong otomatis dari kartu kredit
   - Perpanjangan otomatis setiap tahun

2. **Autodebet Rekening Tabungan**
   - Potong otomatis dari rekening bank
   - Perlu perpanjangan manual setiap tahun

**Cara Daftar Autodebet:**
1. Isi formulir permohonan autodebet
2. Lampirkan:
   - Fotokopi KTP
   - Fotokopi Kartu BPJS
   - Fotokopi Kartu Kredit/Rekening (Buku Tabungan)
3. Serahkan ke kantor BPJS atau bank partner
4. Tunggu verifikasi (7-14 hari kerja)

**Keuntungan Autodebet:**
- Tidak perlu ingat tanggal bayar
- Terhindar dari denda keterlambatan
- Kartu aktif terus`,
    faqs: [
      { question: 'Bagaimana cara daftar autodebet?', answer: 'Isi formulir permohonan autodebet, lampirkan fotokopi KTP, Kartu BPJS, dan kartu kredit/buku rekening, lalu serahkan ke kantor BPJS atau bank partner.' },
      { question: 'Apakah autodebet berlaku terus menerus?', answer: 'Untuk autodebet kartu kredit perpanjangan otomatis, untuk autodebet rekening harus perpanjang setiap tahun.' }
    ],
    keywords: 'autodebet,otomatis,kartu kredit,rekening,potong',
    applicable_personas: ['RELIABLE_PAYER', 'FORGETFUL_PAYER'],
    priority: 9
  },
  {
    kb_id: 'PAY_005',
    category: 'Pembayaran',
    subcategory: 'Tunggakan',
    title: 'Cara Mengatasi Tunggakan Iuran',
    summary: 'Solusi untuk peserta dengan tunggakan iuran BPJS',
    detail_content: `Tunggakan iuran BPJS dapat mengakibatkan kartu tidak aktif.

**Konsekuensi Tunggakan:**
- Kartu BPJS tidak aktif
- Tidak bisa berobatie gratis
- Ada denda keterlambatan 2% per bulan

**Solusi untuk Tunggakan:**

1. **Tunggakan < 6 Bulan**
   - Bayar semua tunggakan + denda
   - Kartu aktif kembali setelah pembayaran
   - Bisa bayar cicilan (min 3 bulan)

2. **Tunggakan 6-12 Bulan**
   - Perlu aktifkan kembali kartu
   - Bayar maksimal 12 bulan tunggakan
   - Sisa tunggakan dianggap hapus

3. **Tunggakan > 12 Bulan**
   - Wajib daftar ulang
   - Bayar maksimal 24 bulan tunggakan
   - Dapat nomor kartu baru

**Tips:**
- Hubungi kantor BPJS untuk skema cicilan
- Minta keringanan denda jika ada kesulitan finansial`,
    faqs: [
      { question: 'Berapa denda tunggakan BPJS?', answer: 'Denda keterlambatan 2% dari biaya iuran per bulan.' },
      { question: 'Bagaimana cara aktifkan kartu dengan tunggakan?', answer: 'Bayar tunggakan maksimal 12 bulan (untuk tunggakan 6-12 bulan) atau 24 bulan (untuk tunggakan > 12 bulan), lalu aktifkan kembali di kantor BPJS.' }
    ],
    keywords: 'tunggakan,denda,aktif,kartu,cicilan,hapus',
    applicable_personas: ['FINANCIAL_STRUGGLE', 'FORGETFUL_PAYER'],
    priority: 10
  },

  // ==================== KEANGGOTAAN (MEMBER_XXX) ====================
  {
    kb_id: 'MEMBER_001',
    category: 'Keanggotaan',
    subcategory: 'Pendaftaran',
    title: 'Cara Daftar BPJS Kesehatan',
    summary: 'Panduan pendaftaran BPJS Kesehatan untuk peserta baru',
    detail_content: `BPJS Kesehatan menyediakan jaminan kesehatan nasional untuk seluruh rakyat Indonesia.

**Kategori Peserta:**
1. **Pekerja Penerima Upah (PPU)** - Pekerja formal
2. **Pekerja Bukan Penerima Upah (PBPU)** - Freelancer, pekerja informal
3. **Bukan Pekerja (BP)** - Investor, pensiunan
4. **Penerima Bantuan Iuran (PBI)** - Penerima bantuan pemerintah

**Cara Daftar:**

**Online (via Mobile JKN):**
1. Download aplikasi Mobile JKN
2. Register dengan nomor HP
3. Isi data diri (KTP, KK, foto)
4. Pilih kelas kepesertaan:
   - Kelas 1: Rp150.000/bulan
   - Kelas 2: Rp100.000/bulan
   - Kelas 3: Rp35.000/bulan
5. Bayar iuran pertama
6. Dapatkan nomor kartu virtual

**Offline (via Kantor BPJS):**
1. Bawa KTP + KK
2. Isi formulir pendaftaran
3. Pilih fasilitas kesehatan (faskes) tingkat 1
4. Bayar iuran pertama
5. Tunggu kartu fisik (14 hari kerja)

**Dokumen yang Diperlukan:**
- Fotokopi KTP
- Fotokopi KK
- Foto 3x4 (2 lembar)
- Alamat email
- Nomor HP aktif`,
    faqs: [
      { question: 'Apa syarat daftar BPJS?', answer: 'Syarat daftar BPJS: KTP, KK, foto 3x4, alamat email, dan nomor HP aktif.' },
      { question: 'Berapa biaya iuran BPJS per bulan?', answer: 'Iuran BPJS: Kelas 1 Rp150.000, Kelas 2 Rp100.000, Kelas 3 Rp35.000 per bulan.' }
    ],
    keywords: 'daftar,pendaftaran,peserta baru,syarat,ktp,kk,kelas',
    applicable_personas: ['NEW_MEMBER'],
    priority: 10
  },
  {
    kb_id: 'MEMBER_002',
    category: 'Keanggotaan',
    subcategory: 'Kartu',
    title: 'Cetak Ulang Kartu BPJS',
    summary: 'Panduan cetak ulang kartu BPJS yang hilang atau rusak',
    detail_content: `Kartu BPJS Kesehatan sangat penting untuk berobat. Jika hilang atau rusak, bisa cetak ulang.

**Cara Cetak Ulang:**

**1. Via Mobile JKN:**
- Buka aplikasi Mobile JKN
- Login dengan akun Anda
- Pilih menu "Kartu"
- Klik "Cetak Kartu"
- Simpan PDF atau screenshot kartu

**2. Via Kantor BPJS:**
1. Bawa KTP asli
2. Minta cetak ulang kartu di loket
3. Kartu jadi dalam 5-10 menit
4. Gratis tanpa biaya

**3. Via Chatbot PANDAWA:**
1. Kirim pesan: "Saya mau cetak kartu"
2. Berikan nomor kartu BPJS
3. Kami kirim kartu digital via WhatsApp

**Kartu Digital vs Fisik:**
- Kartu digital dari Mobile JKN sah digunakan
- Bisa ditunjukkan langsung dari HP saat berobat
- Kartu fisik opsional, tapi disarankan untuk backup`,
    faqs: [
      { question: 'Bagaimana cara cetak ulang kartu BPJS?', answer: 'Cetak ulang kartu BPJS bisa via Mobile JKN (menu Kartu > Cetak Kartu), kantor BPJS (bawa KTP), atau via chatbot PANDAWA.' },
      { question: 'Apakah kartu digital BPJS sah?', answer: 'Ya, kartu digital dari Mobile JKN sah digunakan untuk berobat.' }
    ],
    keywords: 'cetak,kartu,hilang,rusak,digital,ulang',
    applicable_personas: ['NEW_MEMBER', 'RELIABLE_PAYER', 'FORGETFUL_PAYER'],
    priority: 7
  },
  {
    kb_id: 'MEMBER_003',
    category: 'Keanggotaan',
    subcategory: 'Kenaikan Kelas',
    title: 'Cara Naik Kelas BPJS',
    summary: 'Panduan mengubah kelas kepesertaan BPJS ke kelas lebih tinggi',
    detail_content: `Peserta BPJS bisa naik kelas untuk mendapatkan fasilitas kamar yang lebih baik.

**Kelas Kepesertaan:**
- **Kelas 1**: Rp150.000/bulan - Kamar VIP (1-2 bed)
- **Kelas 2**: Rp100.000/bulan - Kamar Kelas 1 (2-3 bed)
- **Kelas 3**: Rp35.000/bulan - Kamar Kelas 2/3 (3-4 bed)

**Cara Naik Kelas:**

**1. Via Mobile JKN:**
1. Login ke aplikasi Mobile JKN
2. Pilih menu "Kelas Perawatan"
3. Pilih kelas yang diinginkan
4. Konfirmasi perubahan
5. Berlaku bulan depan

**2. Via Kantor BPJS:**
1. Isi formulir perubahan kelas
2. Serahkan ke loket kantor BPJS
3. Tunggu verifikasi (1-3 hari kerja)
4. Perubahan berlaku bulan depan

**Catatan Penting:**
- Perubahan kelas berlaku bulan berikutnya
- Bisa naik/turun kelas setiap saat
- Tidak ada biaya admin untuk perubahan kelas
- Kenaikan kelas tidak mengurangi hak pelayanan`,
    faqs: [
      { question: 'Bagaimana cara naik kelas BPJS?', answer: 'Naik kelas BPJS bisa via Mobile JKN (menu Kelas Perawatan) atau kantor BPJS dengan mengisi formulir perubahan kelas.' },
      { question: 'Kapan perubahan kelas berlaku?', answer: 'Perubahan kelas berlaku mulai bulan berikutnya setelah pengajuan.' }
    ],
    keywords: 'naik,kelas,ubah,kamar,upgrade',
    applicable_personas: ['RELIABLE_PAYER'],
    priority: 6
  },
  {
    kb_id: 'MEMBER_004',
    category: 'Keanggotaan',
    subcategory: 'Keluarga',
    title: 'Menambahkan Anggota Keluarga',
    summary: 'Panduan menambahkan istri, suami, atau anak sebagai tanggungan',
    detail_content: `Peserta BPJS bisa menambahkan anggota keluarga sebagai tanggungan (maksimal 5 orang).

**Syarat Menambahkan Tanggungan:**
1. **Suami/Istri** - Bawa fotokopi KK & Buku Nikah
2. **Anak** (maksimal 3 anak):
   - Anak kandung (fotokopi Akta Lahir)
   - Anak tiri (fotokopi Akta Lahir + bukti adopsi)
   - Anak angkat (fotokopi Akta Lahir + surat adopsi)

**Cara Menambahkan:**

**1. Via Mobile JKN:**
1. Login ke aplikasi
2. Pilih menu "Keluarga"
3. Klik "Tambah Keluarga"
4. Upload dokumen yang diperlukan
5. Tunggu verifikasi (3-7 hari kerja)

**2. Via Kantor BPJS:**
1. Bawa dokumen asli + fotokopi
2. Isi formulir penambahan tanggungan
3. Serahkan ke loket
4. Tunggu verifikasi (1-3 hari kerja)

**Biaya Tambahan:**
- Suami/Istri: Sesuai kelas peserta utama
- Anak ke-1 & ke-2: Gratis (dibayar pemerintah)
- Anak ke-3 dst: Bayar full sesuai kelas

**Catatan:**
- Anak maksimal usia 21 tahun (belum menikah)
- Tanggungan harus satu KK dengan peserta utama`,
    faqs: [
      { question: 'Bagaimana cara menambahkan anak sebagai tanggungan?', answer: 'Menambahkan anak bisa via Mobile JKN (menu Keluarga > Tambah Keluarga) atau kantor BPJS dengan melampirkan fotokopi Akta Lahir.' },
      { question: 'Berapa biaya tambahan untuk tanggungan?', answer: 'Suami/istri bayar sesuai kelas peserta utama. Anak ke-1 dan ke-2 gratis. Anak ke-3 dst bayar full.' }
    ],
    keywords: 'tambah,keluarga,istri,suami,anak,tanggungan',
    applicable_personas: ['NEW_MEMBER', 'RELIABLE_PAYER'],
    priority: 8
  },

  // ==================== FASKES (FASKES_XXX) ====================
  {
    kb_id: 'FASKES_001',
    category: 'Faskes',
    subcategory: 'Pendaftaran',
    title: 'Cara Ganti Faskes Tingkat 1',
    summary: 'Panduan mengubah fasilitas kesehatan tingkat 1 (FKTP)',
    detail_content: `Peserta BPJS bisa mengganti Fasilitas Kesehatan Tingkat 1 (FKTP) sesuai kebutuhan.

**Jenis FKTP:**
1. **Puskesmas** - Pelayanan kesehatan primer
2. **Klinik Pratama** - Klinik swasta kerjasama BPJS
3. **Dokter Praktik Perorangan** - Dokter umum/keluarga berkerjasama
4. **RS Tipe D** - Rumah sakit pratama

**Cara Ganti Faskes:**

**1. Via Mobile JKN:**
1. Login ke aplikasi
2. Pilih menu "Faskes"
3. Pilih "Ubah Faskes"
4. Cari faskes yang diinginkan
5. Konfirmasi perubahan
6. Berlaku H+1 setelah pengajuan

**2. Via Kantor BPJS:**
1. Isi formulir perubahan faskes
2. Pilih faskes baru
3. Serahkan ke loket kantor BPJS
4. Perubahan berlaku H+1

**Alasan Umum Ganti Faskes:**
- Pindah domisili
- Faskes terlalu jauh
- Tidak cocok dengan pelayanan
- Faskes tutup/kontrak habis

**Catatan:**
- Bisa ganti faskes maksimal 3 kali per tahun
- Ganti faskes tidak perlu alasan khusus`,
    faqs: [
      { question: 'Bagaimana cara ganti faskes BPJS?', answer: 'Ganti faskes bisa via Mobile JKN (menu Faskes > Ubah Faskes) atau kantor BPJS dengan mengisi formulir perubahan faskes.' },
      { question: 'Kapan perubahan faskes berlaku?', answer: 'Perubahan faskes berlaku H+1 setelah pengajuan.' }
    ],
    keywords: 'ganti,faskes,puskesmas,klinik,ubah',
    applicable_personas: ['NEW_MEMBER', 'RELIABLE_PAYER'],
    priority: 7
  },

  // ==================== KLAIM (CLAIM_XXX) ====================
  {
    kb_id: 'CLAIM_001',
    category: 'Klaim',
    subcategory: 'Berobat',
    title: 'Prosedur Berobat dengan BPJS',
    summary: 'Panduan lengkap berobat menggunakan kartu BPJS Kesehatan',
    detail_content: `Berobat dengan BPJS itu mudah dan gratis. Ikuti prosedur berikut:

**Berobat di Faskes Tingkat 1 (Puskesmas/Klinik):**

1. **Datang ke faskes** (pagi hari lebih baik)
2. **Bawa dokumen:**
   - Kartu BPJS (asli/cetak digital)
   - KTP
   - Kartu kontrol/kunjungan (jika kontrol)
3. **Daftar di loket pendaftaran**
4. **Tunggu panggilan**
5. **Periksa ke dokter**
6. **Ambil obat di instalasi farmasi** (jika diresepkan)

**Berobat di Rumah Sakit (Rujukan):**

1. **Punya surat rujukan** dari faskes tingkat 1
2. **Datang ke RS** yang dituju
3. **Daftar di loket BPJS/Verifikasi**
4. **Tunggu verifikasi** (5-15 menit)
5. **Periksa ke poli/dokter**
6. **Rawat inap** (jika diperlukan)

**Rawat Inap:**
- Gratis tanpa bayar apapun
- Makan 3x sehari gratis
- Administrasi ditangani BPJS

**Catatan Penting:**
- Selalu bawa kartu BPJS & KTP
- Rujukan berlaku 1 bulan (untuk poli spesialis)
- Rujukan berlaku 3 bulan (untuk rawat inap)
- Tidak perlu bayar admin atau biaya lain`,
    faqs: [
      { question: 'Apa syarat berobat dengan BPJS?', answer: 'Syarat berobat: Kartu BPJS, KTP, dan surat rujukan (untuk berobat ke RS/spesialis).' },
      { question: 'Apakah berobat dengan BPJS gratis?', answer: 'Ya, berobat dengan BPJS gratis tanpa biaya admin, termasuk obat dan rawat inap.' }
    ],
    keywords: 'berobat,rs,rawat inap,rujukan,gratis',
    applicable_personas: ['NEW_MEMBER', 'RELIABLE_PAYER', 'FORGETFUL_PAYER'],
    priority: 10
  },
  {
    kb_id: 'CLAIM_002',
    category: 'Klaim',
    subcategory: 'Rujukan',
    title: 'Cara Mendapatkan Surat Rujukan',
    summary: 'Panduan mendapatkan surat rujukan untuk berobat ke spesialis atau RS',
    detail_content: `Surat rujukan diperlukan untuk berobat ke poli spesialis atau rawat inap di rumah sakit.

**Jenis Rujukan:**
1. **Rujukan Poli Spesialis** - Berlaku 1 bulan
2. **Rujukan Rawat Inap** - Berlaku 3 bulan
3. **Rujukan Khusus** - Untuk kasus tertentu (kanker, jantung, dll)

**Cara Mendapatkan Rujukan:**

**1. Datang ke Faskes Tingkat 1:**
- Puskesmas
- Klinik pratama
- Dokter praktik perorangan

**2. Periksa ke Dokter Umum:**
- Jelaskan keluhan/kondisi
- Dokter akan menilai apakah perlu rujukan
- Dokter akan memberikan surat rujukan jika diperlukan

**3. Terima Surat Rujukan:**
- Berisi diagnosis sementara
- Tujuan rujukan (RS/poliklinik)
- Berlaku 1 bulan (poli) atau 3 bulan (rawat inap)

**Sistem Rujukan Online (SATUSEHAT):**
- Rujukan sekarang sistem online
- Tidak perlu bawa surat fisik
- Cukup sebutkan nomor rujukan di RS tujuan
- RS bisa cek langsung di sistem

**Kasus Darurat:**
- Kecelakaan darurat tidak butuh rujukan
- Persalinan darurat tidak butuh rujukan
- Serangan jantung/stroke tidak butuh rujukan

**Catatan:**
- Rujukan hanya bisa diberikan dokter di faskes
- Tidak bisa minta rujukan langsung ke RS`,
    faqs: [
      { question: 'Bagaimana cara mendapatkan surat rujukan BPJS?', answer: 'Datang ke faskes tingkat 1 (puskesmas/klinik), periksa ke dokter umum, dan minta surat rujukan jika diperlukan.' },
      { question: 'Berapa lama surat rujukan berlaku?', answer: 'Rujukan poli spesialis berlaku 1 bulan, rujukan rawat inap berlaku 3 bulan.' }
    ],
    keywords: 'rujukan,spesialis,rs,surat,online,satusehat',
    applicable_personas: ['NEW_MEMBER', 'RELIABLE_PAYER'],
    priority: 9
  },

  // ==================== APLIKASI (APP_XXX) ====================
  {
    kb_id: 'APP_001',
    category: 'Aplikasi',
    subcategory: 'Mobile JKN',
    title: 'Panduan Aplikasi Mobile JKN',
    summary: 'Cara menggunakan aplikasi Mobile JKN untuk layanan BPJS digital',
    detail_content: `Mobile JKN adalah aplikasi resmi BPJS Kesehatan untuk layanan digital.

**Fitur Utama Mobile JKN:**
1. **Kartu Digital** - Cetak kartu BPJS langsung dari HP
2. **Cek Tagihan** - Cek iuran dan tunggakan
3. **Riwayat Pelayanan** - Lihat riwayat berobat
4. **Booking Faskes** - Daftar antrian faskes online
5. **Konsultasi Dokter** - Chat dengan dokter via video
6. **E-Claim** - Klaim reimbursement online

**Cara Download & Register:**
1. Download di Play Store/App Store
2. Buka aplikasi
3. Klik "Daftar"
4. Masukkan nomor HP
5. Verifikasi OTP
6. Buat password/PIN
7. Login dengan nomor HP & password

**Cara Login:**
- Pilih menu "Login"
- Masukkan nomor HP
- Masukkan password/PIN
- Klik "Masuk"

**Menu Penting:**
- **Beranda**: Info ringkasan kepesertaan
- **Kartu**: Cetak kartu digital
- **Riwayat**: Riwayat berobat dan tagihan
- **Booking**: Daftar antrian faskes
- **Chatting**: Chat dengan dokter
- **Profil**: Kelola data diri

**Tips:**
- Aktifkan fingerprint/Face ID untuk login cepat
- Screenshot kartu digital untuk backup`,
    faqs: [
      { question: 'Bagaimana cara daftar Mobile JKN?', answer: 'Download aplikasi Mobile JKN, klik Daftar, masukkan nomor HP, verifikasi OTP, buat password, dan login.' },
      { question: 'Apakah bisa cetak kartu BPJS di Mobile JKN?', answer: 'Ya, bisa cetak kartu digital BPJS di menu Kartu pada aplikasi Mobile JKN.' }
    ],
    keywords: 'mobile jkn,aplikasi,download,daftar,login',
    applicable_personas: ['NEW_MEMBER', 'RELIABLE_PAYER', 'FORGETFUL_PAYER'],
    priority: 9
  },
  {
    kb_id: 'APP_002',
    category: 'Aplikasi',
    subcategory: 'PANDAWA',
    title: 'Cara Menggunakan Chatbot PANDAWA',
    summary: 'Panduan menggunakan chatbot PANDAWA untuk layanan BPJS via WhatsApp',
    detail_content: `PANDAWA (Pelayanan Administrasi Melalui WhatsApp) adalah chatbot resmi BPJS untuk layanan via WhatsApp.

**Nomor PANDAWA:**
- WhatsApp: 0811-8747-7700

**Layanan PANDAWA:**
1. **Cek Status Kepesertaan** - Cek kartu aktif/tidak
2. **Cek Tagihan** - Cek iuran dan tunggakan
3. **Informasi Faskes** - Cari faskes terdekat
4. **Booking Antrian** - Daftar antrian faskes online
5. **Konsultasi** - Tanya jawab seputar BPJS

**Cara Menggunakan:**
1. Simpan nomor PANDAWA di kontak
2. Buka WhatsApp
3. Chat ke PANDAWA
4. Pilih menu yang diinginkan
5. Ikuti instruksi

**Contoh Chat:**
- "Halo, saya mau cek status kepesertaan"
- "Berapa tagihan BPJS saya?"
- "Cari faskes terdekat dari Jakarta Selatan"
- "Saya mau booking antrian di Puskesmas Kebayoran"

**Jam Operasional:**
- Senin - Jumat: 08.00 - 17.00 WIB
- Sabtu: 08.00 - 12.00 WIB
- Minggu/Libur: Tutup

**Response Time:**
- Instant chat reply: 1-5 detik
- Informasi umum: Langsung
- Cek data peserta: 10-30 detik
- Booking antrian: 30-60 detik

**Tips:**
- Gunakan bahasa Indonesia yang jelas
- Sertakan nomor kartu BPJS jika diminta
- Screenshot percakapan untuk bukti`,
    faqs: [
      { question: 'Berapa nomor WhatsApp PANDAWA?', answer: 'Nomor WhatsApp PANDAWA: 0811-8747-7700.' },
      { question: 'Layanan apa saja yang tersedia di PANDAWA?', answer: 'Layanan PANDAWA: Cek status kepesertaan, cek tagihan, informasi faskes, booking antrian, dan konsultasi.' }
    ],
    keywords: 'pandawa,chatbot,whatsapp,cs,layanan',
    applicable_personas: ['NEW_MEMBER', 'RELIABLE_PAYER', 'FORGETFUL_PAYER', 'FINANCIAL_STRUGGLE'],
    priority: 10
  }
];

async function seedKnowledgeBase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_TDWkVJGyEp94@ep-autumn-wildflower-a1rqhzux-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    await client.connect();
    console.log('✅ Connected to NeonDB');

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const entry of PANDAWA_KB_ENTRIES) {
      try {
        // Check if kb_id already exists
        const existingResult = await client.query(
          'SELECT kb_id FROM pandawa_knowledge_base WHERE kb_id = $1',
          [entry.kb_id]
        );

        if (existingResult.rows.length > 0) {
          console.log(`⏭️  Skipping existing KB ID: ${entry.kb_id}`);
          skippedCount++;
          continue;
        }

        // Insert new entry
        await client.query(
          `INSERT INTO pandawa_knowledge_base (
            kb_id, category, subcategory, title, summary, detail_content,
            faqs, keywords, priority, applicable_personas, is_active, version, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
          [
            entry.kb_id,
            entry.category,
            entry.subcategory || null,
            entry.title,
            entry.summary,
            entry.detail_content,
            JSON.stringify(entry.faqs || []),
            entry.keywords || null,
            entry.priority || 0,
            JSON.stringify(entry.applicable_personas || []),
            true,
            1
          ]
        );

        console.log(`✅ Created KB entry: ${entry.kb_id} - ${entry.title}`);
        createdCount++;
      } catch (err) {
        console.error(`❌ Error inserting ${entry.kb_id}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n=== SEEDING SUMMARY ===');
    console.log(`✅ Created: ${createdCount} entries`);
    console.log(`⏭️  Skipped: ${skippedCount} entries`);
    console.log(`❌ Errors: ${errorCount} entries`);
    console.log(`📊 Total processed: ${PANDAWA_KB_ENTRIES.length} entries`);

  } catch (err) {
    console.error('❌ Database error:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('✅ Database connection closed');
  }
}

seedKnowledgeBase();
