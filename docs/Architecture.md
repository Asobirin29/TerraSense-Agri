# SYSTEM ARCHITECTURE & DATA PIPELINE
**Project Name:** TerraSense Agri  
**Architecture Style:** Modular Client-Server with Offline-First Capabilities (PHP Native REST API + Vanilla JS/React Hybrid).

## 1. High-Level System Architecture
TerraSense Agri memisahkan secara tegas antara lapisan presentasi (*Frontend UI*), lapisan logika bisnis/geospasial (*Backend API*), dan lapisan penyimpanan (*Database*).
[ Frontend Client (PWA / Web Browser) ]
├── Leaflet.js + Esri Imagery (Satellite Map)
├── Turf.js (Spatial Math: Area & Centroid)
├── html2pdf.js (PDF Blueprint Generator)
└── LocalStorage / Service Worker (Offline Cache)
│
▼ (AJAX / Fetch REST API in JSON)
[ Backend Endpoints (PHP Native API / Server) ]
├── /api/auth.php    (JWT Auth, OTP WhatsApp, Session)
├── /api/farms.php   (CRUD Farm Polygons GeoJSON)
├── /api/evaluate.php(The Law of Minimum Engine)
└── /api/export.php  (PDF & Report Handlers)
│
▼ (PDO Secure Connection)
[ Database Layer (MySQL / PostgreSQL) ]
├── Relational Tables (Users, Farms, Evaluations)
└── Agricultural Matrix (Komoditas & Syarat Tumbuh)
## 2. External API Integrations (Zero-Budget Ecosystem)
* **Esri World Imagery:** `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` (Free satellite tiles).
* **Open-Meteo Elevation API:** `https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lng}` (Real-time altitude / MDPL).
* **Open-Meteo Weather API:** `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current=temperature_2m,relative_humidity_2m,precipitation` (Live weather data).
* **SoilGrids REST API (ISRIC):** Optional global soil property fetcher based on centroid coordinates.

## 3. Data Execution Pipeline (The Evaluation Flow)
1. **Draw & Capture:** Petani menggambar poligon `L` di atas peta Leaflet.
2. **Spatial Math:** `Turf.js` menghitung luas area `A` (Hektar) dan mengekstraksi koordinat centroid `C(lat, lng)`.
3. **Async Fetching:** Frontend mengirim `C` ke Open-Meteo API untuk mendapatkan Elevasi `E` dan Suhu/Hujan `W`.
4. **User Interception:** Modal Kuesioner 3 Pertanyaan muncul untuk meminta data Tekstur `T`, Kedalaman `D`, dan Banjir `F`.
5. **Payload Submission:** Paket data `{C, A, E, W, T, D, F}` dikirim ke endpoint `/api/evaluate.php`.
6. **Backend Evaluation:** Algoritma PHP membandingkan paket data dengan tabel `syarat_tumbuh` menggunakan *Law of Minimum*.
7. **Response & Render:** JSON hasil evaluasi dikembalikan ke frontend dan ditampilkan dalam tata letak *Bento Grid*.

## 4. Security & Skalabilitas
* **SQL Injection Prevention:** Seluruh kueri database di `config/database.php` dan folder `api/` WAJIB menggunakan PDO Prepared Statements.
* **Upload Sandbox:** Direktori `/uploads/` dibatasi ketat hanya menerima MIME types gambar (`image/jpeg`, `image/png`) untuk mencegah *Shell Upload Vulnerability*.
* **Rate Limiting:** Pembatasan maksimal 60 request/menit per IP pada endpoint evaluasi untuk mencegah serangan DDoS atau scraping data.
