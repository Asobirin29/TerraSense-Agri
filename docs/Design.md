# UI/UX DESIGN SYSTEM: "MODERN HERITAGE & CLEAN NATURE-TECH"
**Project Name:** TerraSense Agri  
**Design Philosophy:** Ramah petani, keterbacaan tinggi di bawah terik matahari outdoor, elegan, profesional, dan bergaya "Bento Grid" ala startup teknologi kelas dunia.

## 1. Color Palette (Tailwind Tokens)
Hindari warna hitam pekat bergaya neon sci-fi yang menyilaukan dan sulit dibaca di kebun. Gunakan palet hibrida terang/semi-gelap yang membumi:
* `bg-heritage-base`: `#F9FAFB` (Off-White / Putih Gading bersih sebagai latar utama).
* `bg-heritage-surface`: `#FFFFFF` (Putih murni untuk kartu Bento Grid dengan bayangan lembut).
* `text-heritage-dark`: `#1F2937` (Dark Charcoal untuk teks utama, kontras tinggi).
* `text-heritage-muted`: `#6B7280` (Warm Gray untuk label dan teks sekunder).
* `primary-forest`: `#065F46` (Deep Forest Green untuk tombol utama, header, dan elemen aktif).
* `accent-emerald`: `#10B981` (Emerald Green menyala untuk indikator lahan sehat / status S1).
* `accent-gold`: `#D97706` (Warm Sand / Gold untuk badge fitur Premium / status S2).
* `alert-orange`: `#EA580C` (Warm Orange untuk faktor pembatas / status S3).
* `alert-red`: `#DC2626` (Red untuk status N / Tidak Sesuai).

## 2. Layout Architecture (The Bento Grid Experience)
* **Background Layer:** Peta satelit Esri berlayar penuh (*full-bleed*) dengan kontrol zoom minimalis di pojok kiri bawah.
* **Top-Left Header:** Floating bar putih bersih dengan logo pohon/radar daun modern, judul "TerraSense Agri", dan status koneksi (Online/Offline PWA Badge).
* **Right-Side Slide-Over Panel (Bento Grid):** Panel mengambang di sisi kanan (`w-full md:w-[420px] rounded-2xl shadow-xl bg-white/95 backdrop-blur-md border border-gray-100 p-6`) yang muncul halus saat lahan selesai digambar.
  * **Bento Box 1 (Hero Stat):** Luas lahan (Ha) dengan angka besar tebal (`text-3xl font-extrabold text-primary-forest`) bersanding dengan elevasi (MDPL).
  * **Bento Box 2 (Micro-Weather):** Grid 3 kolom kecil untuk Suhu (°C), Kelembapan (%), dan Curah Hujan (mm).
  * **Bento Box 3 (Top Recommendations):** Daftar kartu tanaman yang diurutkan dari S1 ke S3, lengkap dengan bar persentase kecocokan dan tag komoditas (misal: "Komoditas Emas Sumedang").
  * **Bento Box 4 (Premium Actions):** Tombol hijau besar "Export Lahan untuk KUR BRI" dan toggle WhatsApp Reminder.

## 3. Micro-Questionnaire UI (3-Question Modal)
* Tampilan modal ketengah layar dengan latar belakang *backdrop-blur* gelap transparan (`bg-black/40`).
* Setiap pertanyaan ditampilkan satu per satu atau dalam grid 3 kartu horizontal interaktif.
* Petani hanya perlu mengeklik tombol kartu berikon (tanpa perlu mengetik teks manual) agar sangat mudah dioperasikan dengan jempol.

## 4. Typography & Accessibility
* **Font Family:** `Inter`, `Plus Jakarta Sans`, atau `system-ui` dengan bobot `300`, `400`, `600`, `700`, dan `800`.
* **Touch Targets:** Seluruh tombol aksi (tombol gambar lahan, tombol navigasi, tombol jawab kuesioner) memiliki ukuran minimal `48px x 48px` sesuai standar aksesibilitas mobile untuk jari petani yang kasar atau sarung tangan kebun.