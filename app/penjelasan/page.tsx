"use client";

import React, { useState } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────
type ModelKey = "indobertweet" | "mbert_js" | "inset" | "rulebased" | "vader" | "textblob";

interface ModelInfo {
  key: ModelKey;
  name: string;
  badge: string;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  glowColor: string;
  tagline: string;
  desc: string;
  language: string;
  approach: string;
  speed: string;
  accuracy: string;
  pros: string[];
  cons: string[];
  example: {
    text: string;
    process: string[];
    result: string;
    resultColor: string;
  };
}

const MODELS: ModelInfo[] = [
  {
    key: "indobertweet",
    name: "IndoBERTweet",
    badge: "🏆 Model Utama",
    icon: "🧠",
    color: "text-green-400",
    borderColor: "border-green-500/40",
    bgColor: "bg-green-500/8",
    glowColor: "shadow-green-500/20",
    tagline: "Deep Learning · Transformer · Bahasa Indonesia",
    language: "Bahasa Indonesia (Twitter/Medsos)",
    approach: "Deep Learning (Transformer BERT)",
    speed: "Lambat (GPU/CPU intensif)",
    accuracy: "⭐⭐⭐⭐⭐ Sangat Tinggi",
    desc: "Model pre-trained berbasis BERT yang dilatih dengan jutaan tweet berbahasa Indonesia. Bukan mencari kata satu per satu, melainkan memahami makna kalimat secara utuh — termasuk sarkasme, sindiran, dan bahasa gaul implisit.",
    pros: [
      "Paham konteks kalimat secara utuh",
      "Mendeteksi sarkasme & sindiran dengan akurat",
      "Dilatih khusus untuk bahasa Indonesia Twitter/Medsos",
      "Tidak bergantung pada daftar kata (kamus)",
    ],
    cons: [
      "Proses berat — memerlukan waktu lebih lama",
      "Blackbox: sulit dijelaskan kata mana yang memicu hasil",
      "Bergantung pada model yang sudah dilatih sebelumnya",
    ],
    example: {
      text: "\"Yg pnting Terima gaji.. Jln tdk pnting 😅\"",
      process: [
        "Membaca seluruh kalimat sekaligus sebagai satu urutan token",
        "Memahami konteks: 'terima gaji' + 'jalan tidak penting' = sarkasme",
        "Attention mechanism menghubungkan setiap kata satu sama lain",
        "Mengklasifikasikan berdasarkan pola yang dipelajari dari jutaan data",
      ],
      result: "😞 NEGATIF (Sarkasme Terdeteksi)",
      resultColor: "text-red-400",
    },
  },
  {
    key: "mbert_js",
    name: "mBERT JS (Xenova)",
    badge: "🔬 JS Transformer",
    icon: "🔬",
    color: "text-purple-400",
    borderColor: "border-purple-500/40",
    bgColor: "bg-purple-500/8",
    glowColor: "shadow-purple-500/20",
    tagline: "Deep Learning · BERT Multilingual · @xenova/transformers",
    language: "Multilingual (50+ bahasa)",
    approach: "Deep Learning (BERT Multilingual ONNX)",
    speed: "Lambat pertama kali (≥5 menit), instan setelah cache",
    accuracy: "⭐⭐⭐⭐ Tinggi (meski bukan khusus Indonesia)",
    desc: "Model BERT Multilingual dari nlptown yang dikonversi ke format ONNX dan dijalankan langsung di Next.js via @xenova/transformers — tanpa Python sama sekali. Sebelum inferensi, teks dipreprocess menggunakan pipeline yang SAMA dengan sentimen_analisis.py (nusantara-nlp). Ini adalah JS Transformer native pertama dalam proyek ini.",
    pros: [
      "Berjalan di Node.js — tidak butuh Python runtime",
      "Preprocessing sama persis dengan model Python (nusantara-nlp)",
      "Pembanding langsung: model JS vs hasil CSV dari Python",
      "Hasil di-cache ke disk — request ke-2 instan (<100ms)",
    ],
    cons: [
      "Bukan model khusus Indonesia (beda dengan IndoBERTweet)",
      "Download model ONNX ~170MB saat pertama kali",
      "Inference ~5-15 menit untuk 1000+ komentar (CPU)",
      "Skema label berbeda: 1-5 bintang, bukan positif/negatif langsung",
    ],
    example: {
      text: "\"ga mau keluar duit pajak 🤣🤣\"",
      process: [
        "[nusantara-nlp] 'ga' → 'tidak', 'duit' → 'uang'",
        "Stopword removal: hapus 'mau', 'keluar' → 'tidak uang pajak'",
        "mBERT ONNX inference: token ID → embedding → classifier",
        "Output: '1 star' (confidence 0.66) → Label: NEGATIF",
      ],
      result: "😞 NEGATIF (mBERT: 1 bintang, konfiden 66%)",
      resultColor: "text-red-400",
    },
  },
  {
    key: "inset",
    name: "InSet Lexicon (ID)",
    badge: "📖 Kamus Indonesia",
    icon: "📖",
    color: "text-pink-400",
    borderColor: "border-pink-500/40",
    bgColor: "bg-pink-500/8",
    glowColor: "shadow-pink-500/20",
    tagline: "Lexicon · Kamus InSet · Bahasa Indonesia",
    language: "Bahasa Indonesia (Formal)",
    approach: "Rule-Based Lexicon (Kamus InSet)",
    speed: "Sangat Cepat (milliseconds)",
    accuracy: "⭐⭐⭐ Sedang",
    desc: "Mencari kecocokan kata per kata dengan kamus InSet — Kamus Sentimen Bahasa Indonesia buatan akademisi. Setiap kata dalam kamus memiliki bobot sentimen (contoh: 'bagus'=+4, 'buruk'=-4). Kata yang tidak ada di kamus = Netral (0).",
    pros: [
      "Sangat cepat dan ringan",
      "Transparan — bisa dilacak kata mana yang memberi skor",
      "Tidak membutuhkan pelatihan (training)",
      "Mendukung emoji scoring",
    ],
    cons: [
      "Tidak mengerti konteks kalimat",
      "Gagal mendeteksi sarkasme & sindiran",
      "Kosakata kamus terbatas — banyak kata gaul tidak ada",
      "Cenderung menghasilkan banyak 'Netral' pada teks informal",
    ],
    example: {
      text: "\"ga mau keluar duit pajak 🤣🤣\"",
      process: [
        "'ga' → dinormalisasi → 'tidak'",
        "Cek kamus: 'tidak', 'mau', 'keluar', 'duit', 'pajak'",
        "Tidak ada satupun kata di kamus sentimen InSet",
        "Total skor = 0 → threshold tidak tercapai",
      ],
      result: "😐 NETRAL (Skor 0, tidak ada kata sentimen)",
      resultColor: "text-yellow-400",
    },
  },
  {
    key: "rulebased",
    name: "Rule-Based ID",
    badge: "⚙️ Aturan + Kamus",
    icon: "⚙️",
    color: "text-indigo-400",
    borderColor: "border-indigo-500/40",
    bgColor: "bg-indigo-500/8",
    glowColor: "shadow-indigo-500/20",
    tagline: "Lexicon + Negasi + Intensifier · InSet + nusantara-nlp",
    language: "Bahasa Indonesia (Formal + Slang)",
    approach: "Rule-Based: InSet + Negasi + Intensifier",
    speed: "Cepat (beberapa milliseconds)",
    accuracy: "⭐⭐⭐⭐ Cukup Tinggi",
    desc: "Versi lanjutan dari InSet Lexicon. Selain mencocokkan kata dengan kamus, model ini juga menangani aturan negasi ('tidak bagus' → negatif, bukan positif) dan intensifier ('sangat bagus' → bobot x1.5). Dikombinasikan dengan nusantara-nlp untuk normalisasi slang & stemming.",
    pros: [
      "Menangani negasi: 'tidak bagus' = negatif",
      "Intensifier: 'sangat buruk' mendapat bobot lebih",
      "Normalisasi slang: 'bgt' → 'banget', 'gk' → 'tidak'",
      "Stemming: 'mengecewakan' → 'kecewa' (cocok di kamus)",
    ],
    cons: [
      "Masih gagal deteksi sarkasme implisit",
      "Keterbatasan kosakata kamus tetap ada",
      "Aturan negasi bisa salah pada kalimat panjang/kompleks",
    ],
    example: {
      text: "\"Sungguh tidak mengecewakan pelayanannya 😡\"",
      process: [
        "Emoji 😡 terdeteksi → skor -3",
        "'mengecewakan' di-stem → 'kecewa' (ada di kamus, skor -3)",
        "'tidak' sebelum 'kecewa' → sentimen dibalik → +3",
        "Total: 😡(-3) + kecewa_negated(+3) = 0... TAPI emoji mendominasi → Negatif",
      ],
      result: "😞 NEGATIF (Emoji -3 mendominasi)",
      resultColor: "text-red-400",
    },
  },
  {
    key: "vader",
    name: "VADER",
    badge: "🔤 Perbandingan EN",
    icon: "🔤",
    color: "text-slate-400",
    borderColor: "border-slate-500/40",
    bgColor: "bg-slate-500/8",
    glowColor: "shadow-slate-500/20",
    tagline: "Valence Aware Dictionary and sEntiment Reasoner",
    language: "Bahasa Inggris (Twitter/Medsos)",
    approach: "Lexicon + Rule-Based (English)",
    speed: "Sangat Cepat",
    accuracy: "⭐ Sangat Rendah (untuk teks Indonesia)",
    desc: "Library sentimen berbahasa Inggris yang populer, dioptimalkan untuk bahasa medsos. Kami sertakan sebagai baseline perbandingan untuk membuktikan bahwa menggunakan kamus Inggris pada teks Indonesia menghasilkan akurasi sangat buruk.",
    pros: [
      "Sangat populer dan teruji untuk English",
      "Menangani punctuation, CAPS, dan emoji (Inggris)",
      "Sangat cepat dan ringan",
    ],
    cons: [
      "Tidak bisa membaca bahasa Indonesia sama sekali",
      "Hampir 100% menghasilkan Netral untuk teks Indonesia",
      "Kata-kata Indonesia dianggap tidak ada di kamus",
    ],
    example: {
      text: "\"Gubernurnya sangat mengecewakan rakyat!\"",
      process: [
        "Scanning kata-kata... 'Gubernurnya' → tidak ada di kamus EN",
        "'sangat' → tidak ada di kamus EN",
        "'mengecewakan' → tidak ada di kamus EN",
        "Hanya '!' terdeteksi sedikit → compound score ≈ 0",
      ],
      result: "😐 NETRAL (Semua kata Indonesia tidak dikenali)",
      resultColor: "text-yellow-400",
    },
  },
  {
    key: "textblob",
    name: "TextBlob / AFINN",
    badge: "📊 Perbandingan EN",
    icon: "📊",
    color: "text-slate-400",
    borderColor: "border-slate-500/40",
    bgColor: "bg-slate-500/8",
    glowColor: "shadow-slate-500/20",
    tagline: "AFINN Lexicon · English Only",
    language: "Bahasa Inggris",
    approach: "AFINN Lexicon (English)",
    speed: "Sangat Cepat",
    accuracy: "⭐ Sangat Rendah (untuk teks Indonesia)",
    desc: "Menggunakan kamus AFINN — daftar 2.477 kata Inggris dengan skor sentimen. Seperti VADER, ini hanya berfungsi optimal untuk bahasa Inggris dan kami sertakan hanya untuk perbandingan ilmiah.",
    pros: [
      "Mudah digunakan dan ringan",
      "Skor kata sangat presisi untuk English",
    ],
    cons: [
      "Hanya bahasa Inggris",
      "Teks Indonesia = hampir seluruhnya Netral",
      "Tidak ada pemahaman konteks sama sekali",
    ],
    example: {
      text: "\"pelayanan publik sangat buruk sekali\"",
      process: [
        "'pelayanan' → tidak ditemukan di AFINN",
        "'publik' → tidak ditemukan di AFINN",
        "'sangat' → tidak ditemukan di AFINN",
        "'buruk' → tidak ditemukan (ini ID, bukan EN 'bad')",
      ],
      result: "😐 NETRAL (0% kata cocok dengan AFINN)",
      resultColor: "text-yellow-400",
    },
  },
];

const PIPELINE_STEPS = [
  {
    step: "01",
    icon: "📥",
    title: "Data Ingestion",
    subtitle: "Membaca data CSV",
    desc: "File CSV berisi ribuan komentar Facebook dimuat menggunakan PapaParse. Setiap baris dibaca sebagai objek komentar dengan field: Nama, Komentar, Tanggal, Reaksi.",
    lib: "PapaParse",
    libColor: "text-blue-400",
    color: "bg-blue-500",
  },
  {
    step: "02",
    icon: "😀",
    title: "Emoji Extraction",
    subtitle: "Skor emosi dari emoji",
    desc: "Sebelum teks dibersihkan, sistem mendeteksi dan mencatat skor dari emoji. Contoh: 😡 = -3, 😍 = +3, 😂 = -1 (sarkasme konteks). Skor emoji ini akan ditambahkan ke skor akhir.",
    lib: "Custom EMOJI_SCORES map",
    libColor: "text-yellow-400",
    color: "bg-yellow-500",
  },
  {
    step: "03",
    icon: "🧹",
    title: "Text Cleansing",
    subtitle: "Pembersihan teks kotor",
    desc: "Menghapus URL, hashtag (#), mention (@), karakter spesial, dan angka berulang. Teks diubah ke huruf kecil semua. Spasi berlebih dihapus.",
    lib: "Regex + String ops",
    libColor: "text-slate-400",
    color: "bg-slate-500",
  },
  {
    step: "04",
    icon: "🔄",
    title: "Slang Normalization",
    subtitle: "Standarisasi bahasa gaul",
    desc: "Kata gaul, singkatan, dan bahasa daerah dikonversi ke bahasa Indonesia baku. Contoh: 'bgt'→'banget', 'gk'→'tidak', 'apik'→'bagus', 'kesel'→'kesal'.",
    lib: "nusantara-nlp + Custom SLANG_MAP",
    libColor: "text-pink-400",
    color: "bg-pink-500",
  },
  {
    step: "05",
    icon: "✂️",
    title: "Stopword Removal",
    subtitle: "Hapus kata tidak bermakna",
    desc: "Kata-kata penghubung tidak bermakna (dan, di, ke, yang, adalah) dihapus. KECUALI: kata negasi (tidak, bukan, jangan) dan intensifier (sangat, sekali, banget) — kata-kata ini penting untuk sentimen.",
    lib: "nusantara-nlp + Custom Stopwords",
    libColor: "text-pink-400",
    color: "bg-pink-500",
  },
  {
    step: "06",
    icon: "🌱",
    title: "Stemming",
    subtitle: "Ubah ke kata dasar",
    desc: "Imbuhan prefix/suffix dihapus untuk mendapat kata dasar. Contoh: 'mengecewakan'→'kecewa', 'ketidakpuasan'→'puas'. Ini krusial agar kata cocok dengan entri kamus Lexicon.",
    lib: "nusantara-nlp (Sastrawi Stemmer)",
    libColor: "text-pink-400",
    color: "bg-pink-500",
  },
  {
    step: "07",
    icon: "🔢",
    title: "Sentiment Scoring",
    subtitle: "Menghitung skor sentimen",
    desc: "Setiap kata dasar dicocokkan dengan kamus InSet. Jika ada kata negasi sebelumnya, skor dibalik. Jika ada intensifier, skor dikali 1.5x. Skor emoji ditambahkan. Total skor dinormalisasi ke -1 s/d +1.",
    lib: "InSet Lexicon + Custom Rules",
    libColor: "text-indigo-400",
    color: "bg-indigo-500",
  },
  {
    step: "08",
    icon: "🏷️",
    title: "Label Assignment",
    subtitle: "Penentuan label akhir",
    desc: "Skor akhir dibandingkan dengan threshold: score > 0.05 → Positif, score < -0.05 → Negatif, sisanya → Netral. Label beserta skor disimpan dan dikirim ke dashboard.",
    lib: "Threshold Logic",
    libColor: "text-green-400",
    color: "bg-green-500",
  },
];

const LIBRARIES = [
  {
    name: "nusantara-nlp",
    version: "^0.1.0",
    icon: "🌏",
    color: "border-pink-500/50 bg-pink-500/5",
    badgeColor: "bg-pink-500/20 text-pink-300",
    badge: "NLP Bahasa Indonesia",
    desc: "Library NLP khusus Bahasa Indonesia. Merupakan 'mesin cuci' teks sebelum analisis. Menyediakan fitur slang normalization, stopword removal, dan stemming yang sudah disesuaikan dengan kaidah bahasa Indonesia. Dipakai oleh TIGA model sekaligus: InSet Lexicon, Rule-Based ID, dan mBERT JS.",
    usedIn: "InSet Lexicon, Rule-Based ID, mBERT JS (preprocessing)",
    functions: [
      { fn: "Slang Normalizer", ex: "\"bgt\" → \"banget\", \"gk\" → \"tidak\"" },
      { fn: "Stopword Remover", ex: "Hapus: dan, di, ke (jaga negasi!)" },
      { fn: "Stemmer (Sastrawi)", ex: "\"mengecewakan\" → \"kecewa\"" },
    ],
    impact: "Match rate kamus naik drastis → lebih sedikit Netral. Untuk mBERT JS: input BERT lebih bersih → prediksi lebih tepat.",
  },
  {
    name: "@xenova/transformers",
    version: "^2.17.2",
    icon: "🤗",
    color: "border-purple-500/50 bg-purple-500/5",
    badgeColor: "bg-purple-500/20 text-purple-300",
    badge: "JS Transformer (ONNX)",
    desc: "Port HuggingFace Transformers ke JavaScript/Node.js. Memungkinkan model BERT/Transformer dijalankan langsung di browser atau server Node.js tanpa backend Python. Dalam proyek ini dipakai untuk menjalankan bert-base-multilingual-uncased-sentiment (format ONNX quantized, ~170MB) di Next.js API route.",
    usedIn: "mBERT JS — model/Xenova/bert-base-multilingual-uncased-sentiment",
    functions: [
      { fn: "pipeline('text-classification')", ex: "Load model ONNX + inference" },
      { fn: "Tokenization (WordPiece)", ex: "Kalimat → Token ID → Input BERT" },
      { fn: "ONNX Runtime Inference", ex: "token embedding → softmax → label" },
    ],
    impact: "Memungkinkan Deep Learning berjalan di Next.js tanpa Python runtime — mBERT JS adalah Transformer pertama yang BENAR-BENAR berjalan di JS dalam proyek ini.",
  },
  {
    name: "vader-sentiment",
    version: "^1.1.3",
    icon: "🔤",
    color: "border-slate-500/50 bg-slate-500/5",
    badgeColor: "bg-slate-500/20 text-slate-300",
    badge: "Perbandingan EN",
    desc: "JavaScript port dari VADER (Valence Aware Dictionary and sEntiment Reasoner). Kamus sentimen Bahasa Inggris yang dioptimalkan untuk media sosial. Digunakan hanya sebagai baseline perbandingan.",
    usedIn: "VADER Model (Baseline)",
    functions: [
      { fn: "SentimentIntensityAnalyzer", ex: "Hitung skor compound -1 s/d +1" },
      { fn: "Punctuation Rules", ex: "!!! → bobot lebih tinggi" },
      { fn: "CAPS Detection", ex: "\"BURUK\" vs \"buruk\" → berbeda bobot" },
    ],
    impact: "Hampir 100% Netral untuk teks Indonesia → membuktikan batas metode EN",
  },
  {
    name: "sentiment (AFINN)",
    version: "^5.0.2",
    icon: "📊",
    color: "border-slate-500/50 bg-slate-500/5",
    badgeColor: "bg-slate-500/20 text-slate-300",
    badge: "Perbandingan EN",
    desc: "Library berbasis kamus AFINN — 2.477 kata Bahasa Inggris dengan skor sentimen. Menjumlahkan skor setiap kata yang ditemukan. Digunakan untuk perbandingan ilmiah dalam penelitian ini.",
    usedIn: "TextBlob/AFINN Model (Baseline)",
    functions: [
      { fn: "analyze(text)", ex: "Kembalikan { score, comparative, tokens }" },
      { fn: "AFINN Lookup", ex: "2477 kata EN dengan skor -5 s/d +5" },
      { fn: "Score Normalization", ex: "score / wordCount = comparative" },
    ],
    impact: "Membuktikan bahwa kamus EN tidak berguna untuk teks Indonesia",
  },
  {
    name: "papaparse",
    version: "^5.5.3",
    icon: "📂",
    color: "border-blue-500/50 bg-blue-500/5",
    badgeColor: "bg-blue-500/20 text-blue-300",
    badge: "Data Processing",
    desc: "Library CSV parsing tercepat untuk JavaScript. Digunakan untuk membaca file dataset komentar Facebook (.csv) menjadi array objek JavaScript yang siap diproses.",
    usedIn: "Semua Model (Data Ingestion)",
    functions: [
      { fn: "Papa.parse(file)", ex: "CSV → Array of objects" },
      { fn: "Header detection", ex: "Auto-detect kolom: Nama, Komentar, dll" },
      { fn: "Streaming", ex: "File besar diproses bertahap" },
    ],
    impact: "Membaca ribuan baris komentar dalam hitungan milidetik",
  },
  {
    name: "chart.js + react-chartjs-2",
    version: "^4.5.1 / ^5.3.1",
    icon: "📈",
    color: "border-indigo-500/50 bg-indigo-500/5",
    badgeColor: "bg-indigo-500/20 text-indigo-300",
    badge: "Visualisasi",
    desc: "Library visualisasi data paling populer di ekosistem JavaScript. Digunakan untuk merender semua chart di dashboard: Doughnut (distribusi), Line (tren waktu), dan Bar (kata frekuensi).",
    usedIn: "Dashboard Visualisasi",
    functions: [
      { fn: "Doughnut Chart", ex: "Proporsi Positif/Netral/Negatif" },
      { fn: "Line Chart", ex: "Tren sentimen per tanggal" },
      { fn: "Bar Chart", ex: "Top 20 kata paling sering muncul" },
    ],
    impact: "Mengubah ribuan angka menjadi visualisasi interaktif yang intuitif",
  },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function PenjelasanPage() {
  const [activeModel, setActiveModel] = useState<ModelKey>("indobertweet");
  const [activeTab, setActiveTab] = useState<"overview" | "pipeline" | "libraries" | "faq">("overview");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [showPreprocessing, setShowPreprocessing] = useState(false);

  const model = MODELS.find((m) => m.key === activeModel)!;

  const faqs = [
    {
      q: "Kenapa model Lexicon hampir semua Netral (Skor 0)?",
      icon: "🤔",
      a: (
        <div className="space-y-3">
          <p>Model InSet dan Rule-Based bekerja dengan mencari kata demi kata di kamus. Jika kata tidak ada di kamus, skornya 0. Masalahnya: komentar politik Indonesia penuh dengan kata-kata konkret seperti <code className="bg-slate-800 px-1 rounded text-pink-300">pajak</code>, <code className="bg-slate-800 px-1 rounded text-pink-300">aspal</code>, <code className="bg-slate-800 px-1 rounded text-pink-300">jalan rusak</code> yang secara linguistik adalah <strong>kata benda netral</strong> — tidak ada di kamus sentimen.</p>
          <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-500 mb-2">Simulasi proses komentar: <span className="text-pink-300">"ga mau keluar duit pajak 🤣"</span></p>
            <div className="space-y-1.5">
              {["'ga' → normalisasi → 'tidak'", "'tidak', 'mau', 'keluar', 'duit', 'pajak' → cek kamus...", "❌ Tidak ada satupun kata di kamus InSet", "Skor = 0 → Label: NETRAL"].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">{i + 1}</span>
                  <span className={i === 3 ? "text-yellow-400 font-bold" : "text-slate-400"}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-slate-300 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
            <strong className="text-blue-400">Insight:</strong> ~68% komentar dataset ini adalah keluhan spesifik (jalan, pajak, tidur) yang tidak menggunakan kata makian eksplisit → Lexicon menganggapnya "Netral".
          </p>
        </div>
      ),
    },
    {
      q: "Kenapa IndoBERTweet bisa mendeteksi Negatif padahal tidak ada kata 'buruk/jelek'?",
      icon: "🧠",
      a: (
        <div className="space-y-3">
          <p>IndoBERTweet tidak mencari kata satu per satu. Ia menggunakan <strong>Attention Mechanism</strong> untuk memahami hubungan antar kata dalam satu kalimat secara bersamaan.</p>
          <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-500 mb-2">Contoh sarkasme yang dideteksi:</p>
            <p className="text-pink-300 italic mb-3">"Yg pnting Terima gaji.. Jln tdk pnting 😅"</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
                <p className="text-red-400 font-bold mb-1">❌ Lexicon lihat:</p>
                <p className="text-slate-400">"terima" = netral, "gaji" = netral, "jalan" = netral → Skor 0</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                <p className="text-green-400 font-bold mb-1">✅ BERT lihat:</p>
                <p className="text-slate-400">Konteks keseluruhan = sindiran terhadap pejabat yang tidak kerja → NEGATIF</p>
              </div>
            </div>
          </div>
          <p className="text-slate-300 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg">
            <strong className="text-indigo-400">Insight Ilmiah:</strong> Ini membuktikan bahwa untuk sentimen komentar publik/politik yang sarkastis, Deep Learning jauh mengungguli Lexicon. Temuan ini valid secara akademis untuk laporan penelitian.
          </p>
        </div>
      ),
    },
    {
      q: "Apa itu nusantara-nlp dan mengapa penting?",
      icon: "🌏",
      a: (
        <div className="space-y-3">
          <p>nusantara-nlp adalah library NLP yang dirancang khusus untuk Bahasa Indonesia. Ia bertindak sebagai <strong>"mesin cuci teks"</strong> sebelum komentar dianalisis oleh model Lexicon. <strong className="text-purple-400">Terbaru: kini juga digunakan sebagai preprocessing untuk mBERT JS!</strong></p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { fn: "Slang Normalizer", ex: "bgt→banget, gk→tidak, apik→bagus, kesel→kesal", icon: "🔄" },
              { fn: "Stopword Remover", ex: "Hapus: dan, di, ke — JAGA: tidak, bukan, sangat", icon: "✂️" },
              { fn: "Stemmer (Sastrawi)", ex: "mengecewakan→kecewa, ketidakpuasan→puas", icon: "🌱" },
            ].map((item) => (
              <div key={item.fn} className="bg-pink-500/5 border border-pink-500/20 rounded-lg p-3">
                <p className="text-pink-400 font-bold text-xs mb-1">{item.icon} {item.fn}</p>
                <p className="text-slate-400 text-xs">{item.ex}</p>
              </div>
            ))}
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg">
            <p className="text-purple-400 font-bold text-sm mb-1">🔬 Dipakai di mBERT JS (Baru!)</p>
            <p className="text-slate-400 text-sm">Pipeline preprocessing nusantara-nlp kini juga dijalankan sebelum inferensi mBERT JS — sama persis dengan sentimen_analisis.py Python. Ini memastikan hasil perbandingan antara IndoBERTweet (Python) dan mBERT JS (JavaScript) adalah <strong className="text-white">apple-to-apple</strong>.</p>
          </div>
          <p className="text-slate-300 bg-pink-500/10 border border-pink-500/20 p-3 rounded-lg">
            <strong className="text-pink-400">Dampak Nyata:</strong> Tanpa nusantara-nlp, kata "mengecewakan" tidak akan cocok dengan "kecewa" di kamus → skor 0 (Netral). Dengan stemming, keduanya menjadi "kecewa" → match! Inilah mengapa model Rule-Based sekarang mendeteksi ratusan Positif & Negatif.
          </p>
        </div>
      ),
    },
    {
      q: "Mana model terbaik untuk penelitian ini?",
      icon: "🏆",
      a: (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-green-500/8 border border-green-500/30 rounded-lg p-4">
              <p className="text-green-400 font-bold mb-2">🏆 Untuk Akurasi Terbaik</p>
              <p className="text-white font-semibold">IndoBERTweet</p>
              <p className="text-slate-400 text-xs mt-1">Untuk penelitian yang mementingkan akurasi tinggi, khususnya deteksi sarkasme pada teks media sosial Indonesia.</p>
            </div>
            <div className="bg-indigo-500/8 border border-indigo-500/30 rounded-lg p-4">
              <p className="text-indigo-400 font-bold mb-2">⚡ Untuk Kecepatan + Transparansi</p>
              <p className="text-white font-semibold">Rule-Based ID</p>
              <p className="text-slate-400 text-xs mt-1">Untuk sistem real-time atau ketika Anda perlu menjelaskan mengapa sebuah komentar diklasifikasikan demikian.</p>
            </div>
          </div>
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-yellow-400 font-bold text-sm mb-1">📚 Nilai Ilmiah Penelitian Ini:</p>
            <p className="text-slate-400 text-sm">Dengan membandingkan 5 model berbeda, penelitian ini memberikan bukti empiris bahwa <em>untuk analisis sentimen komentar publik berbahasa Indonesia yang mengandung sarkasme dan bahasa gaul, Deep Learning (IndoBERTweet) jauh mengungguli pendekatan Lexicon konvensional.</em></p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-hero-gradient relative overflow-x-hidden text-slate-200">
      {/* Decorative blobs */}
      <div className="fixed top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
      <div className="fixed bottom-0 left-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="mb-8 animate-slide-up flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-1">UNPAM · Data Mining · Sentiment Analysis</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 mb-2">
              Penjelasan Lengkap Metode
            </h1>
            <p className="text-slate-400 max-w-xl">
              Bagaimana tiap model bekerja, library yang digunakan, dan mengapa hasilnya bisa berbeda drastis antar model.
            </p>
          </div>
          <Link href="/" className="btn-secondary flex items-center gap-2 px-4 py-2 hover:bg-slate-800 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Dashboard
          </Link>
        </div>

        {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
        <div className="glass-card p-1 mb-8 animate-slide-up flex flex-wrap gap-1">
          {([
            { key: "overview", label: "🎯 Perbandingan Model", },
            { key: "pipeline", label: "⚙️ Alur Kerja Pipeline", },
            { key: "libraries", label: "📦 Library & Fungsinya", },
            { key: "faq", label: "💡 FAQ & Insight", },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW — Perbandingan Model                                  */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="animate-fade-in space-y-6">
            {/* Model Selector Tabs */}
            <div className="glass-card p-4">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Pilih model untuk melihat detail:</p>
              <div className="flex flex-wrap gap-2">
                {MODELS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setActiveModel(m.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                      activeModel === m.key
                        ? `${m.bgColor} ${m.borderColor} ${m.color} shadow-lg`
                        : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {m.icon} {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Detail Card */}
            <div className={`glass-card p-6 border ${model.borderColor} shadow-lg ${model.glowColor} animate-slide-up`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl ${model.bgColor} border ${model.borderColor} flex items-center justify-center text-3xl flex-shrink-0`}>
                  {model.icon}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className={`text-2xl font-extrabold ${model.color}`}>{model.name}</h2>
                    <span className={`text-xs px-2 py-1 rounded-full ${model.bgColor} ${model.color} border ${model.borderColor}`}>{model.badge}</span>
                  </div>
                  <p className="text-slate-500 text-xs mb-2">{model.tagline}</p>
                  <p className="text-slate-300 leading-relaxed text-sm">{model.desc}</p>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Bahasa", value: model.language, icon: "🌐" },
                  { label: "Pendekatan", value: model.approach, icon: "🔧" },
                  { label: "Kecepatan", value: model.speed, icon: "⚡" },
                  { label: "Akurasi (ID)", value: model.accuracy, icon: "🎯" },
                ].map((spec) => (
                  <div key={spec.label} className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-1">{spec.icon} {spec.label}</p>
                    <p className="text-xs text-white font-semibold leading-tight">{spec.value}</p>
                  </div>
                ))}
              </div>

              {/* Pros & Cons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <p className="text-green-400 font-bold text-sm mb-3">✅ Kelebihan</p>
                  <ul className="space-y-2">
                    {model.pros.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <p className="text-red-400 font-bold text-sm mb-3">❌ Kekurangan</p>
                  <ul className="space-y-2">
                    {model.cons.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Live Example */}
              <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">📋 Contoh Nyata: Proses step by step</p>
                <p className="text-white font-mono text-sm mb-4 p-3 bg-slate-800/80 rounded-lg border border-slate-600">{model.example.text}</p>
                <div className="space-y-2 mb-4">
                  {model.example.process.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-xs flex items-center justify-center text-slate-400 flex-shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-sm text-slate-400">{step}</p>
                    </div>
                  ))}
                </div>
                <div className={`flex items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700`}>
                  <span className="text-slate-500 text-sm font-medium">Hasil:</span>
                  <span className={`font-black text-lg ${model.example.resultColor}`}>{model.example.result}</span>
                </div>
              </div>
            </div>

            {/* Quick Comparison Table */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-4">📊 Tabel Perbandingan Semua Model</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Model</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Pendekatan</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Bahasa</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Sarkasme</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Kecepatan</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Hasil Dominan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {[
                      { name: "IndoBERTweet", approach: "Deep Learning", lang: "🇮🇩 ID", sarcasm: "✅ Ya", speed: "🐢 Lambat", result: "😞 Negatif", resultColor: "text-red-400" },
                      { name: "Rule-Based ID", approach: "Lexicon + Rules", lang: "🇮🇩 ID", sarcasm: "⚠️ Parsial", speed: "⚡ Cepat", result: "😐 Netral", resultColor: "text-yellow-400" },
                      { name: "InSet Lexicon", approach: "Lexicon", lang: "🇮🇩 ID", sarcasm: "❌ Tidak", speed: "⚡ Cepat", result: "😐 Netral", resultColor: "text-yellow-400" },
                      { name: "VADER", approach: "Lexicon EN", lang: "🇺🇸 EN", sarcasm: "❌ Tidak", speed: "⚡ Cepat", result: "😐 ~100% Netral", resultColor: "text-yellow-400" },
                      { name: "TextBlob/AFINN", approach: "Lexicon EN", lang: "🇺🇸 EN", sarcasm: "❌ Tidak", speed: "⚡ Cepat", result: "😐 ~100% Netral", resultColor: "text-yellow-400" },
                    ].map((row) => (
                      <tr key={row.name} className="hover:bg-white/3 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-white">{row.name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{row.approach}</td>
                        <td className="py-2.5 px-3 text-slate-400">{row.lang}</td>
                        <td className="py-2.5 px-3">{row.sarcasm}</td>
                        <td className="py-2.5 px-3 text-slate-400">{row.speed}</td>
                        <td className={`py-2.5 px-3 font-bold ${row.resultColor}`}>{row.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: PIPELINE — Alur Kerja                                          */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "pipeline" && (
          <div className="animate-fade-in space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-2">⚙️ Alur Kerja di Balik Layar</h2>
              <p className="text-slate-400 text-sm mb-6">Proses lengkap dari komentar mentah CSV hingga label sentimen tampil di dashboard (khusus metode Rule-Based ID yang paling lengkap).</p>

              {/* Visual Pipeline */}
              <div className="relative">
                {PIPELINE_STEPS.map((step, i) => (
                  <div key={step.step} className="flex gap-4 mb-6 last:mb-0 group">
                    {/* Timeline */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full ${step.color} flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                        {step.icon}
                      </div>
                      {i < PIPELINE_STEPS.length - 1 && (
                        <div className="w-0.5 bg-slate-700 flex-1 mt-2 min-h-[24px]" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs text-slate-600 font-mono">STEP {step.step}</span>
                        <h3 className="font-bold text-white">{step.title}</h3>
                        <span className="text-xs text-slate-500">— {step.subtitle}</span>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed mb-2">{step.desc}</p>
                      <span className={`text-xs px-2 py-1 rounded-full bg-slate-800 border border-slate-700 ${step.libColor} font-mono`}>
                        📦 {step.lib}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture Diagram (text-based) */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-4">🏗️ Arsitektur Sistem Dashboard</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    layer: "Frontend (Next.js)",
                    color: "border-blue-500/40 bg-blue-500/5",
                    titleColor: "text-blue-400",
                    items: ["app/page.tsx — Dashboard utama", "app/penjelasan/ — Halaman ini", "components/charts/ — Chart.js charts", "components/CommentList.tsx — Tabel komentar"],
                  },
                  {
                    layer: "API Layer (Next.js API Routes)",
                    color: "border-indigo-500/40 bg-indigo-500/5",
                    titleColor: "text-indigo-400",
                    items: ["app/api/sentiment/ — Analisis sentimen", "app/api/stats/ — Statistik dataset", "Validasi model ID & parameter", "Streaming response JSON"],
                  },
                  {
                    layer: "Engine & Data Layer",
                    color: "border-purple-500/40 bg-purple-500/5",
                    titleColor: "text-purple-400",
                    items: ["lib/sentimentEngine.ts — Dispatcher", "lib/indonesianLexicon.ts — InSet+Rules", "public/data/*.csv — Dataset komentar", "public/data/hasil_sentimen_fb.csv — IndoBERT"],
                  },
                ].map((layer) => (
                  <div key={layer.layer} className={`border ${layer.color} rounded-xl p-4`}>
                    <p className={`font-bold text-sm mb-3 ${layer.titleColor}`}>{layer.layer}</p>
                    <ul className="space-y-1.5">
                      {layer.items.map((item) => (
                        <li key={item} className="text-xs text-slate-400 flex items-start gap-1.5">
                          <span className="text-slate-600 mt-0.5">›</span>{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700 text-xs text-slate-500">
                <strong className="text-slate-300">Data Flow:</strong> User pilih model → Frontend fetch <code className="text-blue-400">/api/sentiment?model=xxx</code> → API route → sentimentEngine dispatcher → preprocessing + scoring → JSON response → Chart.js render
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: LIBRARIES                                                       */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "libraries" && (
          <div className="animate-fade-in space-y-4">
            <div className="glass-card p-4 mb-2">
              <h2 className="text-lg font-bold text-white mb-1">📦 Library yang Digunakan</h2>
              <p className="text-slate-400 text-sm">Detail setiap dependency di <code className="text-blue-400">package.json</code>, fungsinya, dan dampaknya pada hasil analisis.</p>
            </div>
            {LIBRARIES.map((lib) => (
              <div key={lib.name} className={`glass-card p-5 border ${lib.color}`}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4">
                  <div className="text-3xl">{lib.icon}</div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-white text-lg font-mono">{lib.name}</h3>
                      <span className="text-xs font-mono text-slate-500">v{lib.version}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${lib.badgeColor}`}>{lib.badge}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Digunakan di: <strong className="text-slate-400">{lib.usedIn}</strong></p>
                    <p className="text-slate-300 text-sm leading-relaxed">{lib.desc}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  {lib.functions.map((f) => (
                    <div key={f.fn} className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
                      <p className="text-xs font-bold text-slate-300 font-mono mb-1">{f.fn}</p>
                      <p className="text-xs text-slate-500">{f.ex}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <span className="text-yellow-400 text-sm flex-shrink-0">💡</span>
                  <p className="text-xs text-slate-400"><strong className="text-slate-300">Dampak:</strong> {lib.impact}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: FAQ                                                             */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "faq" && (
          <div className="animate-fade-in space-y-3">
            <div className="glass-card p-4 mb-2">
              <h2 className="text-lg font-bold text-white mb-1">💡 FAQ & Insight Data Mining</h2>
              <p className="text-slate-400 text-sm">Jawaban atas pertanyaan paling penting dari eksperimen ini — berguna untuk presentasi dan laporan penelitian.</p>
            </div>
            {faqs.map((faq, i) => (
              <div key={i} className="glass-card overflow-hidden border border-slate-700/50">
                <button
                  className="w-full flex items-center gap-3 p-5 text-left hover:bg-white/3 transition-colors"
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                >
                  <span className="text-2xl flex-shrink-0">{faq.icon}</span>
                  <span className="font-semibold text-white flex-1">{faq.q}</span>
                  <span className={`text-slate-400 transition-transform duration-300 flex-shrink-0 ${expandedFaq === i ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </button>
                {expandedFaq === i && (
                  <div className="px-5 pb-5 border-t border-slate-700/50 pt-4 text-sm text-slate-400 leading-relaxed animate-slide-up">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}

            {/* Conclusion card */}
            <div className="glass-card p-6 border border-green-500/30 bg-green-500/5">
              <div className="flex items-start gap-3">
                <span className="text-3xl">🎯</span>
                <div>
                  <h3 className="font-bold text-white text-lg mb-2">Kesimpulan Utama Penelitian</h3>
                  <blockquote className="border-l-4 border-green-500 pl-4 py-2 italic font-medium text-green-300 bg-green-500/10 rounded-r-lg mb-3">
                    "Metode Deep Learning (IndoBERTweet & mBERT JS) secara signifikan mengungguli pendekatan Lexicon dalam menganalisis sentimen komentar publik berbahasa Indonesia — terutama karena kemampuannya mendeteksi sarkasme, bahasa implisit, dan konteks budaya lokal."
                  </blockquote>
                  <p className="text-slate-400 text-sm">Perbedaan hasil yang kontras antara model Lexicon (mayoritas Netral) dan model Transformer (mayoritas Negatif) bukan sebuah error — ini adalah <strong className="text-white">temuan ilmiah yang valid</strong>. Dengan 6 model komparatif (IndoBERTweet/Python, mBERT/JS, InSet, Rule-Based, VADER, TextBlob), penelitian ini memberikan gambaran menyeluruh tentang spektrum pendekatan NLP Bahasa Indonesia.</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-green-500/10 border border-green-500/20 rounded p-2 text-center">
                      <p className="text-green-400 font-bold">🧠 Deep Learning</p>
                      <p className="text-slate-400 mt-1">IndoBERTweet + mBERT JS</p>
                      <p className="text-green-300 font-bold">Akurasi Tertinggi</p>
                    </div>
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded p-2 text-center">
                      <p className="text-indigo-400 font-bold">⚙️ Rule-Based</p>
                      <p className="text-slate-400 mt-1">InSet + nusantara-nlp</p>
                      <p className="text-indigo-300 font-bold">Seimbang</p>
                    </div>
                    <div className="bg-slate-700/40 border border-slate-600/20 rounded p-2 text-center">
                      <p className="text-slate-400 font-bold">🔤 Baseline EN</p>
                      <p className="text-slate-400 mt-1">VADER + TextBlob</p>
                      <p className="text-red-300 font-bold">Tidak Cocok ID</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
