# PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Project Name:** TerraSense Agri  
**Version:** 2.0 (Enterprise & Premium Ready)  
**Target Audience:** Petani Lokal (Kabupaten Sumedang & Jawa Barat), Penyuluh Pertanian Lapangan (PPL), Dinas Pertanian, dan Lembaga Pembiayaan (Bank/KUR).

## 1. Product Vision & Value Proposition
TerraSense Agri adalah platform *Precision Farming* berbasis web yang memadukan teknologi pemetaan satelit, analisis data geospasial real-time, dan algoritma evaluasi lahan ilmiah berdasarkan standar Balai Penelitian Tanah (2003). Aplikasi ini mentransformasi data fisik lingkungan yang rumit menjadi rekomendasi komoditas dan dosis pupuk yang presisi, praktis, dan langsung dapat diterapkan oleh petani di lapangan.

## 2. Target Personas
* **Petani Lokal (e.g., Kang Asep):** Mengakses lewat HP Android di kebun/sawah. Butuh antarmuka yang simpel, teks yang jelas terbaca di bawah terik matahari, dan rekomendasi praktis tanpa istilah teknis yang membingungkan.
* **Penyuluh Pertanian / PPL:** Membutuhkan data analisis lahan yang akurat untuk memberikan pengarahan kepada kelompok tani di wilayah bimbingannya.
* **Super Admin / Pemilik Platform:** Memantau agregasi data pemetaan lahan, komoditas populer, dan konversi pengguna dari Free ke Premium.

## 3. Core Features (MVP vs Premium Tier)

### A. Free Tier (Basic Mapping & Evaluation)
* **Interactive Satellite Mapping:** Peta satelit resolusi tinggi (Esri World Imagery) dengan fitur gambar poligon lahan mandiri oleh petani.
* **Auto-Geospatial Calculation:** Perhitungan luas lahan otomatis dalam Hektar (Ha) dan penetapan koordinat tengah (*centroid*) menggunakan Turf.js.
* **Real-Time Weather & Elevation:** Integrasi tanpa kunci (*keyless API*) dengan Open-Meteo untuk membaca elevasi (MDPL), suhu, curah hujan, dan kelembapan.
* **3-Question Micro-Questionnaire:** Modal kuesioner singkat untuk menangkap parameter lokal yang tidak terbaca satelit (riwayat banjir, kedalaman batu, dan tekstur tanah basah).
* **Expert Recommendation Engine:** Penentuan kelas kesesuaian lahan (S1, S2, S3, N) untuk 112 komoditas pertanian menggunakan metode "Hukum Minimum".

### B. Premium Tier (Monetization & Business Tools)
* **WhatsApp Gateway Integration:** Pengingat jadwal pemupukan dan perawatan lahan dinamis yang dikirim langsung ke nomor WhatsApp petani.
* **Export Blueprint Lahan (PDF):** Pembuatan dokumen cetak resmi berisi peta poligon, data fisik lahan, rekomendasi komoditas, dan estimasi biaya/pupuk yang sah digunakan sebagai lampiran pengajuan Kredit Usaha Rakyat (KUR) ke Bank BRI/KUD.
* **Offline-First Mode (PWA):** Akses ke peta dan data lahan yang sudah disimpan di memori HP meskipun petani sedang berada di area blank spot / tanpa sinyal di pegunungan.

## 4. Success Metrics
* Waktu yang dibutuhkan petani dari buka web sampai dapat rekomendasi < 2 menit.
* Akurasi logika penentuan kelas S1/S2/S3/N mencapai 100% sesuai matriks Balai Penelitian Tanah (2003).
* Zero crash/error pada koneksi internet lambat (3G/Edge) menggunakan mekanisme *caching* dan *offline fallback*.