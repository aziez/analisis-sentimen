# 📊 Analisis Sentimen Komentar Facebook (UNPAM Data Mining Project)

Proyek ini adalah aplikasi analisis sentimen interaktif untuk komentar Facebook Reels. Aplikasi ini dikembangkan untuk membandingkan performa model **Deep Learning (Transformer)** dengan metode **Lexicon (Rule-Based)** tradisional menggunakan dataset berbahasa Indonesia informal (bahasa media sosial).

Sistem ini terbagi menjadi dua bagian utama:
1. **Python Backend**: Scraping data komentar Facebook, preprocessing awal menggunakan `nusantara-nlp`, dan klasifikasi model utama menggunakan **IndoBERTweet**.
2. **Next.js Dashboard**: Antarmuka visual interaktif untuk menyajikan hasil analisis, visualisasi grafik, dan menyediakan 5 model perbandingan tambahan yang berjalan langsung di Node.js (termasuk **mBERT JS** via `@xenova/transformers`).

---

## 🏗️ Arsitektur & Perbandingan Model

Dashboard ini mendukung analisis dan komparasi dari **6 model sentimen** sekaligus:

| Model | ID Model | Lingkungan | Pendekatan | Bahasa | Keterangan |
|-------|----------|------------|------------|--------|------------|
| **IndoBERTweet** | `indobertweet` | Python / CSV | Deep Learning | 🇮🇩 Indonesia (Medsos) | **Model Utama**. Dilatih dengan jutaan tweet Indonesia. Sangat akurat mendeteksi sarkasme & konteks gaul. |
| **mBERT JS** | `mbert_js` | Next.js API | Deep Learning (ONNX) | 🌐 Multilingual (50+) | Menjalankan model BERT Multilingual langsung di Node.js via `@xenova/transformers`. Menggunakan preprocessing `nusantara-nlp` (sama dengan Python). |
| **InSet Lexicon** | `indonesia_lexicon` | Next.js API | Lexicon (Kamus) | 🇮🇩 Indonesia | Menggunakan kamus sentimen bahasa Indonesia *InSet* buatan akademisi. Setiap kata dicocokkan dengan bobotnya. |
| **Rule-Based ID** | `rule_based_id` | Next.js API | Lexicon + Rules | 🇮🇩 Indonesia | InSet Lexicon yang ditambahkan aturan penanganan kata negasi (`tidak bagus`), intensifier (`sangat buruk`), slang, dan stemming. |
| **VADER** | `vader` | Next.js API | Lexicon EN | 🇺🇸 Inggris | Baseline pembanding. Kamus sentimen bahasa Inggris. Membuktikan bahwa model Inggris tidak efektif untuk teks Indonesia. |
| **TextBlob / AFINN**| `textblob` | Next.js API | Lexicon EN | 🇺🇸 Inggris | Baseline pembanding berbasis kamus AFINN Inggris. |

---

## ⚙️ Alur Kerja Sistem (Pipeline)

```
[ Facebook Reel Comments ]
          │
          ▼
[ Scraping Script (Python) ] ──► Menyimpan ke `fb_comments.csv`
          │
          ├──► [ sentimen_analisis.py (Python) ]
          │          │ (Preprocessing `nusantara-nlp` + Model `IndoBERTweet`)
          │          ▼
          │    [ hasil_sentimen_fb.csv ]
          │          │
          │          ▼ (Dibaca oleh Dashboard)
          ▼
   [ Next.js API ] ──► [ Model JS: mbert_js / rule_based_id / inset / vader ]
          │
          ▼
   [ Interactive Dashboard UI ] ──► Grafik Distribusi, Tren Waktu, Frekuensi Kata, & Ekspor Laporan
```

---

## 🚀 Panduan Memulai

### Prasyarat
- **Python 3.8+**
- **Node.js 18+** & **npm**

---

### 1. Jalankan Script Python (Scraping & Model Utama)

1. Masuk ke folder root proyek:
   ```bash
   cd SENTIMEN_ANALISIS
   ```
2. Instal pustaka Python yang diperlukan:
   ```bash
   pip install pandas matplotlib transformers torch wordcloud
   # Catatan: Pastikan package 'nusantara-nlp' terpasang bila diperlukan oleh skrip preprocessing.
   ```
3. Jalankan analisis sentimen utama (IndoBERTweet):
   ```bash
   python sentimen_analisis.py
   ```
   *Skrip ini akan memproses `fb_comments.csv`, menampilkan visualisasi grafik lokal, dan mengekspor hasilnya ke `hasil_sentimen_fb.csv`.*

---

### 2. Jalankan Dashboard Interaktif (Next.js)

1. Masuk ke folder dashboard:
   ```bash
   cd dashboard
   ```
2. Instal semua dependency Node.js:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
4. Buka browser Anda dan akses **[http://localhost:3000](http://localhost:3000)**.

> [!IMPORTANT]
> **Catatan Pengoperasian Pertama Model mBERT JS (Xenova):**  
> Saat Anda memilih model **mBERT JS (Xenova)** untuk pertama kali di dashboard, sistem memerlukan waktu beberapa menit untuk mengunduh bobot model ONNX (~170MB) secara otomatis dari Hugging Face Hub ke direktori cache lokal Anda.  
> Setelah model selesai diunduh dan diproses sekali, hasil analisis akan disimpan ke dalam **Disk Cache** (`public/data/cache_mbert_js.json`). Request berikutnya akan berjalan instan (`<100ms`).

---

## 📂 Struktur Direktori Penting

```
SENTIMEN_ANALISIS/
├── fb_comment_scrapper.py       # Skrip scraper komentar Facebook Reel
├── fb_comments.csv              # Dataset komentar mentah hasil scraping
├── hasil_sentimen_fb.csv        # Hasil sentimen IndoBERTweet (dari sentimen_analisis.py)
├── sentimen_analisis.py         # Skrip analisis sentimen utama (Python)
│
└── dashboard/                   # Project Next.js Dashboard
    ├── app/                     # Next.js App Router (Halaman Utama & Penjelasan)
    │   ├── page.tsx             # Halaman utama Dashboard
    │   ├── penjelasan/          # Halaman penjelasan ilmiah metode & pipeline
    │   └── api/                 # API Routes (sentiment, stats, stream)
    ├── lib/                     # Engine & Logika Bisnis (lexicon, cache, loaders)
    │   ├── sentimentEngine.ts   # Core engine pembagian tugas komputasi sentimen
    │   ├── jsModelCache.ts      # Logika baca/tulis cache model JS ke disk
    │   └── xenovaLoader.ts      # Singleton model loader @xenova/transformers
    ├── public/data/             # Berkas CSV & JSON Cache hasil analisis
    │   ├── fb_comments.csv      # Simlink/Salinan dataset utama
    │   └── cache_mbert_js.json  # Hasil cache terkomputasi untuk mBERT JS
    └── package.json             # Konfigurasi dependency Node.js
```

---

## 📈 Fitur Dashboard Utama

1. **Ringkasan Statistik (Stat Cards)**: Menampilkan Total Komentar, Total Reaksi, Rata-rata Reaksi, dan Rentang Tanggal dataset secara dinamis.
2. **Tab Selector Model**: Pindah model analisis dalam satu klik untuk membandingkan performa model deep learning vs lexicon secara langsung.
3. **Visualisasi Interaktif**:
   - **Pie/Doughnut Chart**: Distribusi persentase sentimen (Positif, Netral, Negatif).
   - **Line Chart**: Tren sentimen harian seiring berjalannya waktu.
   - **Bar Chart**: 20 kata kotor/informal paling sering muncul (setelah stopword removal).
4. **Tabel Komentar Real-time**: Filter komentar berdasarkan label sentimen untuk mempermudah analisis data kualitatif.
5. **Ekspor Hasil**:
   - **Export CSV**: Unduh berkas sentimen hasil komputasi model yang dipilih.
   - **Export PNG**: Mengambil screenshot dashboard secara instan menggunakan `html2canvas` untuk disertakan dalam dokumen laporan penelitian.
6. **Halaman Penjelasan**: Dokumentasi komprehensif alur preprocessing, fungsi library, kelebihan/kekurangan tiap model, serta FAQ akademik.

---

## 📚 Keterangan Pustaka (Libraries)

- **Python**: `transformers`, `torch` (Inference deep learning), `pandas` (manipulasi data), `matplotlib`, `wordcloud` (visualisasi).
- **Next.js (JS)**:
  - `@xenova/transformers` - Pipeline model klasifikasi sentimen berbasis ONNX runtime.
  - `nusantara-nlp` - Normalisasi bahasa gaul, pembersihan stopword, dan stemming Sastrawi khusus Bahasa Indonesia.
  - `chart.js` & `react-chartjs-2` - Grafik visualisasi interaktif.
  - `html2canvas` - Screenshot dashboard instan.
  - `papaparse` - Fast CSV parsing.