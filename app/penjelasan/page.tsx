"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

// ── Minimal Preprocessing Simulation ─────────────────────────────────────────

const SLANG: Record<string, string> = {
  ga:"tidak", gak:"tidak", ngga:"tidak", gk:"tidak", nggak:"tidak",
  enggak:"tidak", duit:"uang", bgt:"banget",
  udh:"sudah", udah:"sudah", beneran:"benar", kesel:"kesal",
  apik:"bagus", sih:"", mah:"", nih:"", deh:"", dong:"",
  yg:"yang", tp:"tapi", dr:"dari", krn:"karena", dgn:"dengan",
  jg:"juga", ky:"seperti", kyk:"seperti", kayak:"seperti",
  sm:"sama", bner:"benar", bro:"saudara", cuy:"teman",
  minta:"minta", baik:"baik", gitu:"begitu", gimana:"bagaimana",
};

const STOPWORDS = new Set([
  "yang","dan","di","ke","dari","ini","itu","ada","dengan","untuk",
  "pada","atau","juga","mau","bisa","adalah","kita","saya","anda",
  "mereka","kamu","saja","akan","telah","agar","oleh","jika","maka",
  "bila","sama","itu","ini","tersebut","hal","lain","pun","pula",
]);

const KEEP_WORDS = new Set([
  "tidak","bukan","jangan","tanpa","kurang","sangat","sekali","banget","amat","benar","belum",
]);

const EMOJI_SCORES: Record<string,number> = {
  "😡":-3,"😠":-3,"🤬":-3,"😤":-2,"😢":-2,"😭":-2,"😞":-2,"😔":-2,
  "🤣":-1,"😅":-1,"😂":-1,"🙄":-1,"😑":-1,
  "😍":3,"❤️":3,"👍":2,"🙏":2,"😊":2,"🥰":3,"👏":2,"✨":1,"💪":2,
};

interface PreprocessState {
  raw: string;
  emojis: string[];
  emojiScore: number;
  cleaned: string;
  normalized: string;
  noStopword: string;
  stemmed: string;
  tokens: string[];
}

function runPreprocess(raw: string): PreprocessState {
  const emojiRe = /\p{Emoji_Presentation}/gu;
  const emojis = raw.match(emojiRe) ?? [];
  const emojiScore = emojis.reduce((s, e) => s + (EMOJI_SCORES[e] ?? 0), 0);

  const cleaned = raw
    .replace(/https?:\/\/\S+/g, "")
    .replace(/@\w+/g, "")
    .replace(/#\w+/g, "")
    .replace(/\p{Emoji_Presentation}/gu, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const normalized = cleaned
    .split(" ")
    .map((w) => (SLANG[w] !== undefined ? SLANG[w] : w))
    .filter(Boolean)
    .join(" ");

  const noStopword = normalized
    .split(" ")
    .filter((w) => KEEP_WORDS.has(w) || !STOPWORDS.has(w))
    .join(" ");

  const SUFFIXES = ["kan","an","i","nya","lah","kah"];
  const PREFIXES = ["mengecewa","meng","men","mem","me","ber","ter","per","ke"];
  const stemmed = noStopword
    .split(" ")
    .map((word) => {
      let w = word;
      for (const s of SUFFIXES) if (w.endsWith(s) && w.length > s.length + 2) { w = w.slice(0, -s.length); break; }
      for (const p of PREFIXES) if (w.startsWith(p) && w.length > p.length + 2) { w = w.slice(p.length); break; }
      return w;
    })
    .join(" ");

  const tokens = stemmed.split(" ").filter(Boolean);
  return { raw, emojis, emojiScore, cleaned, normalized, noStopword, stemmed, tokens };
}

// ── Data ──────────────────────────────────────────────────────────────────────

const DEFAULT_DEMO_TEXT = "ga mau keluar duit pajak 🤣🤣 beneran udh kesel banget sm pemerintah!!";

const PREPROCESS_STEPS = [
  {
    id: 0, icon: "📝", label: "Teks Asli (Raw Input)",
    color: "#94a3b8",
    desc: "Komentar mentah langsung dari pengguna — penuh emoji, singkatan, simbol, dan bahasa gaul. Ini adalah data yang diterima dari file CSV.",
  },
  {
    id: 1, icon: "😀", label: "Deteksi Emoji",
    color: "#fbbf24",
    desc: "Sebelum dibersihkan, emoji diekstrak dan diberi skor sentimen. 😡 = -3, 😍 = +3, 🤣 = -1 (sarkasme). Skor ini akan ditambahkan ke skor akhir.",
  },
  {
    id: 2, icon: "🧹", label: "Pembersihan Teks",
    color: "#60a5fa",
    desc: "Hapus URL, mention (@user), hashtag (#tag), simbol, angka berulang, dan emoji. Ubah semua ke huruf kecil. Hilangkan spasi berlebih.",
  },
  {
    id: 3, icon: "🔄", label: "Normalisasi Slang",
    color: "#f472b6",
    desc: "Ubah kata gaul, singkatan, dan bahasa daerah ke bentuk baku. Menggunakan kamus custom + nusantara-nlp. Contoh: 'bgt'→'banget', 'gk'→'tidak', 'duit'→'uang'.",
  },
  {
    id: 4, icon: "✂️", label: "Hapus Stopword",
    color: "#a78bfa",
    desc: "Hapus kata penghubung tidak bermakna (dan, di, ke). PENTING: kata negasi (tidak, bukan) dan intensifier (sangat, banget) DIPERTAHANKAN karena krusial untuk sentimen.",
  },
  {
    id: 5, icon: "🌱", label: "Stemming",
    color: "#34d399",
    desc: "Ubah kata berimbuhan ke kata dasar. 'mengecewakan'→'kecewa', 'ketidakpuasan'→'puas'. Menggunakan Sastrawi Stemmer via nusantara-nlp. Ini meningkatkan match rate kamus InSet drastis.",
  },
  {
    id: 6, icon: "🔢", label: "Tokenisasi Akhir",
    color: "#fb923c",
    desc: "Teks bersih dipecah menjadi array token. Setiap token adalah unit analisis. Token-token ini yang dicocokkan ke kamus InSet atau dimasukkan ke model BERT.",
  },
];

const MODELS = [
  {
    icon: "🏆", name: "IndoBERTweet", tag: "Pre-computed Python",
    color: "#22c55e", border: "rgba(34,197,94,0.3)", bg: "rgba(34,197,94,0.08)",
    approach: "Deep Learning — BERT Transformer",
    speed: "⚡ Instan (baca CSV hasil Python)",
    accuracy: "⭐⭐⭐⭐⭐ Tertinggi",
    how: "Bukan dijalankan di browser. User menjalankan sentimen_analisis.py di Python → menghasilkan hasil_sentimen_fb.csv → dashboard membaca kolom label dari CSV tersebut.",
    useCases: "Dataset komentar Facebook (bawaan), atau upload CSV hasil Python",
    pros: ["Akurasi tertinggi untuk Bahasa Indonesia", "Mendeteksi sarkasme & bahasa implisit", "Dilatih dari jutaan tweet Indonesia"],
    cons: ["Membutuhkan Python pipeline terlebih dahulu", "Hanya tersedia jika ada kolom label pre-computed"],
    example: { input: "\"Yg pnting Terima gaji.. Jln tdk pnting 😅\"", output: "😞 NEGATIF", conf: "94%", note: "Sarkasme terdeteksi: sindiran pegawai malas" },
  },
  {
    icon: "🔬", name: "mBERT JS (Xenova)", tag: "JS Transformer",
    color: "#a78bfa", border: "rgba(167,139,250,0.3)", bg: "rgba(167,139,250,0.08)",
    approach: "Deep Learning — BERT Multilingual ONNX",
    speed: "🐢 5-15 menit pertama, ⚡ instan setelah cache",
    accuracy: "⭐⭐⭐⭐ Tinggi (multilingual)",
    how: "Model bert-base-multilingual-uncased-sentiment berjalan di Next.js via @xenova/transformers. Preprocessing sama dengan Python (nusantara-nlp) → ONNX inference → output 1-5 bintang → dikonversi ke label.",
    useCases: "CSV apapun yang diupload user",
    pros: ["Berjalan di Node.js, tanpa Python", "Preprocessing apple-to-apple dengan Python pipeline", "Cache disk: request ke-2 instan"],
    cons: ["Download model ONNX ~170MB pertama kali", "Bukan model khusus Indonesia", "CPU-only: lambat untuk 1000+ baris"],
    example: { input: "\"pelayanan sangat buruk dan mengecewakan\"", output: "😞 NEGATIF", conf: "81%", note: "mBERT: 1-star prediction → NEGATIF" },
  },
  {
    icon: "📖", name: "InSet Lexicon", tag: "Kamus Bahasa Indonesia",
    color: "#f472b6", border: "rgba(244,114,182,0.3)", bg: "rgba(244,114,182,0.08)",
    approach: "Rule-Based Lexicon — Kamus InSet",
    speed: "⚡⚡ Sangat cepat (ms per komentar)",
    accuracy: "⭐⭐⭐ Sedang",
    how: "Setiap token hasil stemming dicocokkan ke kamus InSet (3.000+ kata dengan skor -5 s/d +5). Skor dijumlahkan + emoji score → dinormalisasi → threshold ±0.05 → label.",
    useCases: "CSV apapun yang diupload user",
    pros: ["Sangat cepat dan transparan", "Bisa dilacak kata mana yang memberi skor", "Tanpa pelatihan (training)"],
    cons: ["Tidak paham konteks kalimat", "Banyak komentar → Netral (kata benda tidak ada di kamus)", "Gagal deteksi sarkasme"],
    example: { input: "\"ga mau keluar duit pajak 🤣\"", output: "😐 NETRAL", conf: "38%", note: "'pajak', 'duit' tidak ada di InSet → skor 0" },
  },
  {
    icon: "⚙️", name: "Rule-Based ID", tag: "InSet + Negasi + Intensifier",
    color: "#60a5fa", border: "rgba(96,165,250,0.3)", bg: "rgba(96,165,250,0.08)",
    approach: "Lexicon Diperluas + Aturan Semantik",
    speed: "⚡ Cepat (beberapa ms per komentar)",
    accuracy: "⭐⭐⭐⭐ Cukup Tinggi",
    how: "Sama seperti InSet, tapi ditambah: (1) Negasi — 'tidak bagus' membalik skor +→-, (2) Intensifier — 'sangat buruk' skor ×1.5, (3) Stemming — 'mengecewakan'→'kecewa' match di kamus.",
    useCases: "CSV apapun yang diupload user",
    pros: ["Menangani negasi: 'tidak bagus' = negatif", "Intensifier: 'sangat buruk' bobot lebih", "Stemming meningkatkan match rate kamus"],
    cons: ["Masih gagal deteksi sarkasme implisit", "Kosakata kamus terbatas", "Negasi kompleks bisa salah"],
    example: { input: "\"sungguh tidak mengecewakan sama sekali\"", output: "😊 POSITIF", conf: "71%", note: "negasi+stem: tidak+(kecewa→-3) = +3" },
  },
];

const OUTPUTS = [
  {
    tab: "📊 Overview", icon: "📊",
    color: "#3b82f6",
    title: "Ringkasan Sentimen",
    desc: "Pandangan menyeluruh hasil analisis dalam satu halaman.",
    items: [
      "3 kartu statistik — total Positif, Netral, Negatif + persentase",
      "Health Meter — batang proporsi sentimen berwarna",
      "Pie Chart — distribusi proporsi dengan center label dominan",
      "Line Chart — tren sentimen per tanggal (time series)",
      "Bar Chart — Top-20 kata paling sering muncul",
      "Histogram kepercayaan model (confidence distribution)",
    ],
  },
  {
    tab: "🔍 Text Mining", icon: "🔍",
    color: "#f59e0b",
    title: "Analisis Teks Mendalam",
    desc: "Ekstraksi pola linguistik dari seluruh korpus komentar.",
    items: [
      "Word Cloud — 60 kata terbesar berdasarkan frekuensi, filter per sentimen",
      "N-gram Analysis — unigram/bigram/trigram: frasa yang paling sering muncul",
      "TF-IDF Keywords — kata paling representatif per kelas sentimen",
      "Lexical Diversity — Type-Token Ratio, avg panjang kata, vocabulary richness",
    ],
  },
  {
    tab: "📅 Temporal", icon: "📅",
    color: "#8b5cf6",
    title: "Analisis Waktu & Pola",
    desc: "Kapan sentimen tertentu paling sering muncul?",
    items: [
      "Trend Line — sentimen per tanggal dengan momentum indikator",
      "Heatmap 7×24 — hari × jam: kapan aktivitas/sentimen dominan",
      "Bar chart distribusi hari-dalam-seminggu",
      "Bar chart distribusi per 2-jam interval (prime time komentar)",
    ],
  },
  {
    tab: "👥 Author Analysis", icon: "👥",
    color: "#22c55e",
    title: "Analisis Penulis",
    desc: "Siapa yang berkomentar apa, dan seberapa berpengaruh?",
    items: [
      "Kartu ringkasan — jumlah unik penulis, penulis paling aktif",
      "Tabel Top-30 penulis: sortable by total, avg score, avg reactions",
      "Scatter Plot — confidence vs jumlah reaksi (engagement × sentimen)",
    ],
  },
  {
    tab: "⚖️ Compare", icon: "⚖️",
    color: "#ec4899",
    title: "Perbandingan Model",
    desc: "Jalankan 2 model cepat paralel dan bandingkan hasilnya.",
    items: [
      "Run InSet Lexicon + Rule-Based ID secara paralel",
      "Agreement Rate — % komentar yang label-nya sama antar model",
      "Distribusi side-by-side: bar chart tiap model",
      "Kartu per model dengan loading state independent",
    ],
  },
  {
    tab: "📋 Data Table", icon: "📋",
    color: "#6366f1",
    title: "Tabel Data Interaktif",
    desc: "Eksplorasi komentar satu per satu dengan filter & sort.",
    items: [
      "Tabel 50 baris per halaman dengan paginasi",
      "Filter per sentimen (tabs Semua/Positif/Netral/Negatif)",
      "Pencarian teks bebas di kolom Author + Komentar",
      "Sort by: score, date, reactions",
      "Export CSV — unduh seluruh hasil analisis",
    ],
  },
  {
    tab: "🎭 Emotions", icon: "🎭",
    color: "#f97316",
    title: "Analisis Emosi 8-Dimensi",
    desc: "Klasifikasi emosi dasar Ekman menggunakan kamus Indonesia.",
    items: [
      "8 emosi: Senang, Marah, Takut, Sedih, Terkejut, Jijik, Percaya, Antisipasi",
      "Radar Chart SVG — polygon 8-sumbu, data dari lexicon matching",
      "Bar Chart horizontal — distribusi setiap emosi beserta persentase",
      "Catatan metodologi — pendekatan lexicon-based, limitasi sarkasme",
    ],
  },
];

const TECH_STACK = [
  {
    name: "nusantara-nlp", version: "^0.1.0", icon: "🌏", color: "#f472b6",
    role: "NLP Bahasa Indonesia — slang normalization, stopword removal, stemming Sastrawi",
    usedIn: "InSet Lexicon, Rule-Based ID, mBERT JS (preprocessing)",
  },
  {
    name: "@xenova/transformers", version: "^2.17.2", icon: "🤗", color: "#a78bfa",
    role: "HuggingFace Transformers untuk JS/Node.js — BERT ONNX inference tanpa Python",
    usedIn: "mBERT JS model",
  },
  {
    name: "papaparse", version: "^5.5.3", icon: "📂", color: "#60a5fa",
    role: "CSV parser tercepat di JS — baca dataset ribuan baris dalam milliseconds",
    usedIn: "Semua model (data ingestion + file upload)",
  },
  {
    name: "chart.js + react-chartjs-2", version: "^4.5.1", icon: "📈", color: "#34d399",
    role: "Library visualisasi — Doughnut, Line, Bar, Histogram charts",
    usedIn: "Overview Tab, Temporal Tab, Author Tab",
  },
  {
    name: "html2canvas", version: "^1.4.1", icon: "📸", color: "#fbbf24",
    role: "Screenshot dashboard sebagai PNG untuk presentasi/laporan",
    usedIn: "Export PNG button",
  },
  {
    name: "Next.js 16 + React 19", version: "16.2.7", icon: "⚛️", color: "#94a3b8",
    role: "App Router, API Routes, dynamic imports, SSR/CSR hybrid rendering",
    usedIn: "Seluruh aplikasi",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// ── Main Component ────────────────────────────────────────────────────────────

export default function PenjelasanPage() {
  const [demoText, setDemoText]       = useState(DEFAULT_DEMO_TEXT);
  const [demoStep, setDemoStep]       = useState(-1);
  const [running, setRunning]         = useState(false);
  const [activeModel, setActiveModel] = useState(0);
  const [activeOutput, setActiveOutput] = useState(0);
  const [openFaq, setOpenFaq]         = useState<number | null>(null);

  const result = demoStep >= 0 ? runPreprocess(demoText) : null;

  const runDemo = useCallback(async () => {
    setRunning(true);
    setDemoStep(0);
    for (let i = 0; i <= PREPROCESS_STEPS.length - 1; i++) {
      await delay(500);
      setDemoStep(i);
    }
    setRunning(false);
  }, []);

  function getStepText(step: number): string {
    if (!result) return demoText;
    switch (step) {
      case 0: return result.raw;
      case 1: return result.raw; // same text, emojis highlighted separately
      case 2: return result.cleaned;
      case 3: return result.normalized;
      case 4: return result.noStopword;
      case 5: return result.stemmed;
      case 6: return result.tokens.join("  |  ");
      default: return result.raw;
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", color: "var(--text-primary)" }}>

      {/* ── Sticky Nav ───────────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "var(--bg-surface)", borderBottom: "1px solid var(--border)",
      }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between" style={{ height: 52 }}>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Dashboard
            </Link>
            <span style={{ color: "var(--border-strong)" }}>›</span>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Cara Kerja SentiScope
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            {["#input","#preprocessing","#models","#outputs","#teknologi"].map((h, i) => (
              <a key={h} href={h} className="text-xs px-3 py-1.5 rounded-md transition-all"
                 style={{ color: "var(--text-secondary)" }}
                 onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                 onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}>
                {["Input","Preprocessing","Model","Output","Teknologi"][i]}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-16">

        {/* ── Hero ─────────────────────────────────────────────────────────────── */}
        <div className="animate-fade-in">
          <p className="text-xs font-bold uppercase tracking-widest mb-2"
             style={{ color: "var(--clr-primary)" }}>
            UNPAM · Data Mining · Sentiment Analysis
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            Cara Kerja SentiScope
          </h1>
          <p className="text-base mb-6 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            Panduan lengkap alur text mining — dari file CSV mentah hingga 7 jenis visualisasi analisis sentimen.
            Setiap langkah dijelaskan dengan demo interaktif yang bisa Anda coba sendiri.
          </p>

          {/* Phase overview pills */}
          <div className="flex flex-wrap gap-3">
            {[
              { n:"1", lbl:"Input Data", clr:"#3b82f6" },
              { n:"2", lbl:"Preprocessing", clr:"#f59e0b" },
              { n:"3", lbl:"Model Inference", clr:"#8b5cf6" },
              { n:"4", lbl:"Agregasi", clr:"#22c55e" },
              { n:"5", lbl:"Text Mining Lanjutan", clr:"#ec4899" },
              { n:"6", lbl:"Visualisasi", clr:"#6366f1" },
            ].map((p) => (
              <div key={p.n} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                   style={{ background: `${p.clr}18`, border: `1px solid ${p.clr}35` }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white"
                      style={{ background: p.clr }}>{p.n}</span>
                <span className="text-xs font-semibold" style={{ color: p.clr }}>{p.lbl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── PHASE 1: INPUT DATA ───────────────────────────────────────────────── */}
        <section id="input" className="animate-fade-in">
          <SectionHeader n="01" color="#3b82f6" icon="📥" title="Input Data" />
          <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            SentiScope mendukung dua mode input. Pengguna dapat langsung menganalisis dataset bawaan
            atau mengupload file CSV apapun dengan format kolom yang fleksibel.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Mode A */}
            <div className="card p-5" style={{ borderColor: "rgba(59,130,246,0.3)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                     style={{ background: "rgba(59,130,246,0.15)" }}>📋</div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Mode A: Dataset Bawaan</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>fb_comments.csv · Facebook Data</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  "Komentar Facebook dari API scraping",
                  "Kolom: Nama, Komentar, Tanggal, Reaksi, Balasan",
                  "Sudah ada hasil IndoBERTweet (Python pre-computed)",
                  "Langsung tersedia saat halaman dibuka",
                ].map((s) => (
                  <div key={s} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "#3b82f6", marginTop: 2 }}>✓</span>{s}
                  </div>
                ))}
              </div>
            </div>

            {/* Mode B */}
            <div className="card p-5" style={{ borderColor: "rgba(34,197,94,0.3)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                     style={{ background: "rgba(34,197,94,0.15)" }}>⬆️</div>
                <div>
                  <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Mode B: Upload CSV Kustom</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Format apapun — komentar, ulasan, teks bebas</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  "Drag-and-drop atau klik untuk upload (max 15MB)",
                  "Auto-detect kolom — tampil preview 5 baris pertama",
                  "Column Mapper: pilih kolom teks, penulis, tanggal, reaksi",
                  "Pilih model analisis: mBERT JS, InSet, atau Rule-Based ID",
                  "IndoBERTweet: perlu peta kolom label pre-computed",
                ].map((s) => (
                  <div key={s} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "#22c55e", marginTop: 2 }}>✓</span>{s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upload flow diagram */}
          <div className="mt-5 card p-4">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>Alur Upload CSV Kustom</p>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { icon:"📂", lbl:"Pilih File", sub:"CSV apapun" },
                { icon:"🔍", lbl:"Parse & Preview", sub:"PapaParse" },
                { icon:"🗺️", lbl:"Column Mapping", sub:"Petakan kolom" },
                { icon:"🔬", lbl:"Pilih Model", sub:"mBERT / InSet / Rule-Based" },
                { icon:"▶️", lbl:"Analisis", sub:"/api/analyze" },
                { icon:"📊", lbl:"Tampil Dashboard", sub:"7 tab output" },
              ].map((s, i, arr) => (
                <div key={s.lbl} className="flex items-center gap-2">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-1"
                         style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                      {s.icon}
                    </div>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{s.lbl}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.sub}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <span className="text-lg" style={{ color: "var(--border-strong)" }}>→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PHASE 2: PREPROCESSING ───────────────────────────────────────────── */}
        <section id="preprocessing" className="animate-fade-in">
          <SectionHeader n="02" color="#f59e0b" icon="🧹" title="Text Preprocessing Pipeline" />
          <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            Setiap komentar melewati 6 tahap transformasi sebelum dianalisis sentimen.
            Coba demo interaktif di bawah — masukkan teks lalu klik <strong>Jalankan</strong> untuk melihat setiap transformasi.
          </p>

          {/* Demo Box */}
          <div className="card p-5 mb-6" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold" style={{ color: "#f59e0b" }}>🧪 Demo Interaktif Preprocessing</p>
              <button
                onClick={() => { setDemoStep(-1); setDemoText(DEFAULT_DEMO_TEXT); }}
                className="text-xs py-1 px-3"
                style={{ color: "var(--text-muted)" }}>
                ↺ Reset
              </button>
            </div>

            <textarea
              value={demoText}
              onChange={(e) => { setDemoText(e.target.value); setDemoStep(-1); }}
              placeholder="Ketik komentar Bahasa Indonesia di sini..."
              className="input mb-3"
              rows={2}
              style={{ resize: "none", fontFamily: "monospace", fontSize: 14 }}
            />

            <button
              onClick={runDemo}
              disabled={running || !demoText.trim()}
              className="btn-primary mb-4"
              style={running ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
              {running ? (
                <span className="flex items-center gap-2">
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                  Memproses...
                </span>
              ) : "▶ Jalankan Preprocessing Step by Step"}
            </button>

            {/* Steps */}
            <div className="space-y-3">
              {PREPROCESS_STEPS.map((step, i) => {
                const active = demoStep >= i;
                const current = demoStep === i;
                return (
                  <div key={step.id}
                       className="rounded-xl overflow-hidden transition-all duration-300"
                       style={{
                         border: `1px solid ${active ? step.color + "50" : "var(--border)"}`,
                         background: active ? `${step.color}0e` : "var(--bg-card)",
                         opacity: demoStep < 0 ? 0.5 : active ? 1 : 0.4,
                         transform: current ? "scale(1.01)" : "scale(1)",
                       }}>
                    <div className="flex items-start gap-3 p-4">
                      {/* Step number */}
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                             style={{
                               background: active ? step.color : "var(--bg-input)",
                               color: active ? "#fff" : "var(--text-muted)",
                             }}>
                          {step.icon}
                        </div>
                        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                          S{String(i).padStart(2,"0")}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold" style={{ color: active ? step.color : "var(--text-secondary)" }}>
                            {step.label}
                          </p>
                          {current && running && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                  style={{ background: `${step.color}25`, color: step.color }}>
                              ⚡ Memproses...
                            </span>
                          )}
                        </div>
                        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{step.desc}</p>

                        {/* Result */}
                        {active && result && (
                          <div className="rounded-lg p-3 font-mono text-xs break-words"
                               style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                            {i === 1 ? (
                              <div className="space-y-1">
                                <p style={{ color: "var(--text-secondary)" }}>
                                  Emoji terdeteksi: <strong style={{ color: step.color }}>{result.emojis.join(" ") || "—"}</strong>
                                </p>
                                <p style={{ color: "var(--text-secondary)" }}>
                                  Skor emoji total: <strong style={{ color: result.emojiScore < 0 ? "var(--clr-negative)" : result.emojiScore > 0 ? "var(--clr-positive)" : "var(--clr-neutral)" }}>
                                    {result.emojiScore > 0 ? "+" : ""}{result.emojiScore}
                                  </strong>
                                </p>
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-primary)" }}>{getStepText(i)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Final result */}
            {demoStep >= PREPROCESS_STEPS.length - 1 && result && (
              <div className="mt-4 rounded-xl p-4 animate-slide-up"
                   style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                <p className="text-sm font-bold mb-3" style={{ color: "#22c55e" }}>✅ Preprocessing Selesai — Siap untuk Model Inference</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <Stat label="Token Bersih" value={String(result.tokens.length)} color="#22c55e" />
                  <Stat label="Emoji Ditemukan" value={String(result.emojis.length)} color="#fbbf24" />
                  <Stat label="Skor Emoji" value={`${result.emojiScore > 0 ? "+" : ""}${result.emojiScore}`}
                        color={result.emojiScore < 0 ? "#ef4444" : result.emojiScore > 0 ? "#22c55e" : "#94a3b8"} />
                </div>
                <div className="mt-3 p-2 rounded-lg" style={{ background: "var(--bg-surface)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Token akhir untuk analisis:</p>
                  <div className="flex flex-wrap gap-1">
                    {result.tokens.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-xs font-mono"
                            style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step detail cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { lib: "nusantara-nlp", icon: "🌏", color: "#f472b6",
                fn: "Slang Normalizer", example: "bgt→banget · gk→tidak · kesel→kesal" },
              { lib: "nusantara-nlp", icon: "🌏", color: "#f472b6",
                fn: "Stopword Remover", example: "Hapus: dan, di, ke · Jaga: tidak, banget" },
              { lib: "nusantara-nlp (Sastrawi)", icon: "🌏", color: "#f472b6",
                fn: "Stemmer", example: "mengecewakan→kecewa · ketidakpuasan→puas" },
              { lib: "Custom EMOJI_SCORES", icon: "😀", color: "#fbbf24",
                fn: "Emoji Scorer", example: "😡=-3 · 😍=+3 · 🤣=-1" },
            ].map((card) => (
              <div key={card.fn} className="card p-3">
                <p className="text-xs font-bold mb-1" style={{ color: card.color }}>{card.fn}</p>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{card.example}</p>
                <div className="flex items-center gap-1">
                  <span>{card.icon}</span>
                  <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{card.lib}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PHASE 3: MODEL INFERENCE ──────────────────────────────────────────── */}
        <section id="models" className="animate-fade-in">
          <SectionHeader n="03" color="#8b5cf6" icon="🧠" title="Model Inference — 4 Pendekatan Sentimen" />
          <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            SentiScope menyediakan 4 model sentimen dengan pendekatan berbeda. Setiap model menerima
            token bersih dari preprocessing lalu menghasilkan label Positif/Netral/Negatif beserta skor kepercayaan.
          </p>

          {/* Model selector */}
          <div className="flex flex-wrap gap-2 mb-5">
            {MODELS.map((m, i) => (
              <button key={m.name} onClick={() => setActiveModel(i)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={activeModel === i
                        ? { background: m.bg, border: `1px solid ${m.border}`, color: m.color }
                        : { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                {m.icon} {m.name}
              </button>
            ))}
          </div>

          {/* Active model detail */}
          {(() => {
            const m = MODELS[activeModel];
            return (
              <div className="card p-6 animate-fade-in" style={{ borderColor: m.border }}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                       style={{ background: m.bg, border: `1px solid ${m.border}` }}>
                    {m.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-xl font-extrabold" style={{ color: m.color }}>{m.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
                        {m.tag}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs mb-2">
                      <span style={{ color: "var(--text-muted)" }}>🔧 {m.approach}</span>
                      <span style={{ color: "var(--text-muted)" }}>🎯 {m.accuracy}</span>
                      <span style={{ color: "var(--text-muted)" }}>⚡ {m.speed}</span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{m.how}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {/* Pros */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <p className="text-xs font-bold mb-2" style={{ color: "#22c55e" }}>✅ Kelebihan</p>
                    <ul className="space-y-1.5">
                      {m.pros.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                          <span style={{ color: "#22c55e" }}>+</span>{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Cons */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <p className="text-xs font-bold mb-2" style={{ color: "#ef4444" }}>❌ Keterbatasan</p>
                    <ul className="space-y-1.5">
                      {m.cons.map((c) => (
                        <li key={c} className="flex items-start gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                          <span style={{ color: "#ef4444" }}>−</span>{c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Use case */}
                  <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <p className="text-xs font-bold mb-2" style={{ color: "var(--text-secondary)" }}>📋 Contoh Nyata</p>
                    <div className="p-2 rounded-lg mb-2 font-mono text-xs"
                         style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>
                      {m.example.input}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-base"
                            style={{ color: m.example.output.includes("POSITIF") ? "#22c55e"
                              : m.example.output.includes("NEGATIF") ? "#ef4444" : "#eab308" }}>
                        {m.example.output}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
                        {m.example.conf}
                      </span>
                    </div>
                    <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>{m.example.note}</p>
                    <p className="text-xs mt-2" style={{ color: m.color }}>✔ {m.useCases}</p>
                  </div>
                </div>

                {/* How it works step-by-step */}
                <div className="rounded-xl p-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                  <p className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    Proses internal model ini:
                  </p>
                  <div className="space-y-2">
                    {m.name === "IndoBERTweet" && [
                      "Python sentimen_analisis.py → transformers BERT → generate hasil_sentimen_fb.csv",
                      "Next.js API membaca CSV → extract kolom label & confidence",
                      "Normalise label: 'Positive'→'Positif', 'Negative'→'Negatif'",
                      "Return ke dashboard: {label, score, totalComments, timeSeries}",
                    ].map((s, i) => <Step key={i} n={i+1} text={s} color={m.color} />)}

                    {m.name === "mBERT JS (Xenova)" && [
                      "Load model ONNX dari disk cache (@xenova/transformers) — 170MB first time",
                      "Preprocessing sama dengan Python (nusantara-nlp normalization)",
                      "WordPiece tokenization → input_ids tensor",
                      "ONNX Runtime inference → softmax → 1-5 star rating",
                      "Map: 1-2⭐ → NEGATIF, 3⭐ → NETRAL, 4-5⭐ → POSITIF",
                    ].map((s, i) => <Step key={i} n={i+1} text={s} color={m.color} />)}

                    {m.name === "InSet Lexicon" && [
                      "Tokenisasi teks bersih → array kata dasar",
                      "Setiap token → lookup di kamus InSet (3.000+ kata, skor -5 s/d +5)",
                      "Tambahkan emoji score dari fase ekstraksi awal",
                      "Total skor → normalisasi ke -1..+1",
                      "Threshold: >+0.05 = POSITIF, <-0.05 = NEGATIF, sisanya = NETRAL",
                    ].map((s, i) => <Step key={i} n={i+1} text={s} color={m.color} />)}

                    {m.name === "Rule-Based ID" && [
                      "Tokenisasi → lookup InSet (sama seperti InSet Lexicon)",
                      "Deteksi negasi: jika token sebelumnya 'tidak/bukan' → skor dibalik",
                      "Deteksi intensifier: jika 'sangat/banget/sekali' sebelumnya → skor × 1.5",
                      "Tambahkan emoji score dari fase awal",
                      "Normalisasi + threshold (±0.05) → label akhir",
                    ].map((s, i) => <Step key={i} n={i+1} text={s} color={m.color} />)}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Comparison table */}
          <div className="card p-5 mt-5 overflow-x-auto">
            <p className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>📊 Perbandingan Cepat 4 Model</p>
            <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Model","Pendekatan","Runtime","Sarkasme","CSV Upload","Kecepatan"].map((h) => (
                    <th key={h} className="py-2 px-3 text-left" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["IndoBERTweet","Deep Learning","Python pre-computed","✅ Ya","Label column","⚡ Instan"],
                  ["mBERT JS","BERT Multilingual ONNX","Node.js","⚠️ Parsial","✅ Ya","🐢 Lambat (1x)"],
                  ["InSet Lexicon","Kamus InSet","Node.js","❌ Tidak","✅ Ya","⚡⚡ Cepat"],
                  ["Rule-Based ID","InSet + Aturan","Node.js","⚠️ Parsial","✅ Ya","⚡ Cepat"],
                ].map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}
                      className="transition-all hover:opacity-80"
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2.5 px-3"
                          style={{ color: ci === 0 ? "var(--text-primary)" : "var(--text-secondary)",
                                   fontWeight: ci === 0 ? 700 : 400 }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── PHASE 4+5+6: OUTPUTS ─────────────────────────────────────────────── */}
        <section id="outputs" className="animate-fade-in">
          <SectionHeader n="04-06" color="#22c55e" icon="📈" title="Agregasi, Text Mining & Visualisasi — 7 Tab Output" />
          <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            Setelah setiap komentar mendapat label, SentiScope menjalankan 5 jenis analisis lanjutan
            yang hasilnya dibagi ke 7 tab dashboard yang berbeda.
          </p>

          <div className="flex flex-wrap gap-2 mb-5">
            {OUTPUTS.map((o, i) => (
              <button key={o.tab} onClick={() => setActiveOutput(i)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={activeOutput === i
                        ? { background: `${o.color}20`, border: `1px solid ${o.color}50`, color: o.color }
                        : { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                {o.tab}
              </button>
            ))}
          </div>

          {(() => {
            const o = OUTPUTS[activeOutput];
            return (
              <div className="card p-6 animate-fade-in" style={{ borderColor: `${o.color}35` }}>
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                       style={{ background: `${o.color}15`, border: `1px solid ${o.color}30` }}>
                    {o.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1" style={{ color: o.color }}>{o.title}</h3>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{o.desc}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {o.items.map((item) => (
                    <div key={item} className="flex items-start gap-2 p-3 rounded-lg text-xs"
                         style={{ background: `${o.color}08`, border: `1px solid ${o.color}20` }}>
                      <span style={{ color: o.color, marginTop: 1 }}>◆</span>
                      <span style={{ color: "var(--text-secondary)" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Aggregation info */}
          <div className="card p-5 mt-5">
            <p className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>⚙️ Proses Agregasi (Fase 4) — Terjadi di Server</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon:"📊", label:"Distribusi", desc:"Hitung total Positif/Netral/Negatif + persentase" },
                { icon:"📅", label:"Time Series", desc:"Group komentar per tanggal → array {date, Positif, Netral, Negatif}" },
                { icon:"🔤", label:"Top Words", desc:"Tokenisasi semua teks → hitung frekuensi → top 20" },
                { icon:"📈", label:"Avg Score", desc:"Rata-rata confidence score seluruh komentar" },
              ].map((a) => (
                <div key={a.label} className="card p-3 text-center">
                  <div className="text-2xl mb-2">{a.icon}</div>
                  <p className="text-xs font-bold mb-1" style={{ color: "var(--text-primary)" }}>{a.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{a.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <strong style={{ color: "var(--text-primary)" }}>Text Mining Lanjutan (Fase 5)</strong>
              <span style={{ color: "var(--text-muted)" }}> — Semua berjalan di BROWSER (client-side), tidak butuh API call tambahan: N-gram bigram/trigram, TF-IDF per sentimen class, heatmap temporal 7×24, emotion lexicon matching (8 emosi Ekman), scatter plot confidence vs reaksi, lexical diversity stats.</span>
            </div>
          </div>
        </section>

        {/* ── TEKNOLOGI STACK ───────────────────────────────────────────────────── */}
        <section id="teknologi" className="animate-fade-in">
          <SectionHeader n="07" color="#6366f1" icon="📦" title="Teknologi & Library yang Digunakan" />
          <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            Seluruh stack berjalan di Next.js — tidak ada backend terpisah. Model BERT dijalankan
            langsung di Node.js API routes tanpa Python runtime.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TECH_STACK.map((lib) => (
              <div key={lib.name} className="card p-4"
                   style={{ borderColor: `${lib.color}30` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{lib.icon}</span>
                  <div>
                    <p className="text-sm font-bold font-mono" style={{ color: "var(--text-primary)" }}>{lib.name}</p>
                    <p className="text-xs font-mono" style={{ color: lib.color }}>{lib.version}</p>
                  </div>
                </div>
                <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>{lib.role}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  📍 <em>{lib.usedIn}</em>
                </p>
              </div>
            ))}
          </div>

          {/* Architecture diagram */}
          <div className="card p-5 mt-5">
            <p className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>🏗️ Arsitektur Sistem</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  layer:"Frontend (React + Next.js)",
                  color:"#3b82f6",
                  items:["app/page.tsx — Shell & state management","app/penjelasan/ — Halaman ini","components/tabs/*.tsx — 7 tab analisis","components/charts/*.tsx — Chart.js visualisasi","components/upload/*.tsx — Upload & column mapping"],
                },
                {
                  layer:"API Routes (Next.js Server)",
                  color:"#8b5cf6",
                  items:["GET /api/sentiment?model=X — Dataset bawaan","POST /api/upload — Upload & parse CSV","POST /api/analyze — Analisis CSV kustom","10-menit cache per dataset+model combination","uploadStore.ts — In-memory dataset store"],
                },
                {
                  layer:"Engine & Lib Layer",
                  color:"#22c55e",
                  items:["lib/sentimentEngine.ts — Model dispatcher","lib/csvLoader.ts — CSV & dataset loader","lib/textMining.ts — N-gram, TF-IDF, wordcloud","lib/emotionLexicon.ts — 8 emosi Ekman","lib/indonesianLexicon.ts — InSet + Rule-Based"],
                },
              ].map((l) => (
                <div key={l.layer} className="rounded-xl p-4"
                     style={{ background: `${l.color}08`, border: `1px solid ${l.color}25` }}>
                  <p className="text-xs font-bold mb-3" style={{ color: l.color }}>{l.layer}</p>
                  <ul className="space-y-1.5">
                    {l.items.map((item) => (
                      <li key={item} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <span style={{ color: l.color }}>›</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg text-xs font-mono" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              Data Flow: Browser → <span style={{ color:"#3b82f6" }}>fetch /api/sentiment?model=X</span> → Server → <span style={{ color:"#8b5cf6" }}>sentimentEngine</span> → <span style={{ color:"#f472b6" }}>preprocess</span> → <span style={{ color:"#22c55e" }}>model inference</span> → <span style={{ color:"#f59e0b" }}>computeAggregates</span> → <span style={{ color:"#3b82f6" }}>JSON → React render</span>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────────────── */}
        <section className="animate-fade-in">
          <SectionHeader n="08" color="#f59e0b" icon="💡" title="FAQ & Insight Penelitian" />
          <div className="space-y-3">
            {[
              {
                q: "Kenapa sebagian besar komentar jadi Netral di model Lexicon?",
                a: "Komentar politik Indonesia banyak berisi kata-kata konkret seperti 'pajak', 'aspal', 'jalan rusak'. Kata-kata ini adalah kata benda netral — tidak ada di kamus sentimen InSet. Solusi: gunakan IndoBERTweet (memahami konteks) atau Rule-Based ID (stemming meningkatkan match rate).",
              },
              {
                q: "Mengapa mBERT JS butuh 5-15 menit pertama kali?",
                a: "Model ONNX bert-base-multilingual-uncased-sentiment berukuran ~170MB harus didownload dulu ke disk server. Setelah itu, semua request berikutnya menggunakan cache disk → inference langsung <100ms. Solusi: jalankan satu request di awal sebagai 'warm up'.",
              },
              {
                q: "Apa bedanya InSet Lexicon vs Rule-Based ID?",
                a: "InSet Lexicon: hanya cocokkan kata ke kamus dan jumlahkan skor. Rule-Based ID: sama, TAPI ditambah aturan negasi ('tidak bagus' → -) dan intensifier ('sangat buruk' → skor ×1.5). Rule-Based umumnya lebih akurat karena menangani negasi yang InSet lewatkan.",
              },
              {
                q: "Bagaimana cara mendapatkan hasil IndoBERTweet untuk CSV saya?",
                a: "Jalankan sentimen_analisis.py di komputer lokal Anda dengan file CSV sebagai input. Python akan generate file hasil CSV dengan kolom label. Upload file hasil tersebut ke SentiScope dan petakan kolom 'label' ke field IndoBERTweet di Column Mapper.",
              },
              {
                q: "Apakah data CSV saya disimpan permanen di server?",
                a: "Tidak. Dataset yang diupload disimpan di memori server (in-memory Map) dan hilang saat server restart. Tidak ada penyimpanan ke disk atau database. Cache analisis berlaku 10 menit. Ini by design untuk privasi data pengguna.",
              },
            ].map((faq, i) => (
              <div key={i} className="card overflow-hidden">
                <button className="w-full flex items-center justify-between p-4 text-left transition-all"
                        style={{ background: openFaq === i ? "var(--bg-card-hover)" : "transparent" }}
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                          style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{faq.q}</span>
                  </div>
                  <span style={{ color: "var(--text-muted)", transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 pt-2 text-sm animate-slide-up"
                       style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Conclusion ─────────────────────────────────────────────────────────── */}
        <section className="animate-fade-in">
          <div className="card p-6" style={{ borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.05)" }}>
            <div className="flex items-start gap-4">
              <span className="text-4xl">🎯</span>
              <div>
                <h3 className="text-lg font-extrabold mb-2" style={{ color: "var(--text-primary)" }}>
                  Kesimpulan Penelitian
                </h3>
                <blockquote className="border-l-4 pl-4 py-2 italic mb-4 rounded-r-lg"
                            style={{ borderColor: "#22c55e", background: "rgba(34,197,94,0.1)", color: "#86efac" }}>
                  "Deep Learning (IndoBERTweet & mBERT JS) secara signifikan mengungguli pendekatan Lexicon
                  dalam menganalisis sentimen komentar publik berbahasa Indonesia — terutama karena kemampuannya
                  mendeteksi sarkasme, bahasa implisit, dan konteks budaya lokal."
                </blockquote>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  {[
                    { lbl:"🧠 Deep Learning", sub:"IndoBERTweet + mBERT JS", val:"Akurasi Tertinggi", clr:"#22c55e" },
                    { lbl:"⚙️ Rule-Based", sub:"InSet + nusantara-nlp", val:"Transparan & Cepat", clr:"#3b82f6" },
                    { lbl:"📖 Pure Lexicon", sub:"InSet saja", val:"Baseline (lebih banyak Netral)", clr:"#f59e0b" },
                  ].map((c) => (
                    <div key={c.lbl} className="rounded-xl p-3 text-center"
                         style={{ background: `${c.clr}10`, border: `1px solid ${c.clr}25` }}>
                      <p className="font-bold mb-1" style={{ color: c.clr }}>{c.lbl}</p>
                      <p style={{ color: "var(--text-muted)" }}>{c.sub}</p>
                      <p className="font-semibold mt-1" style={{ color: c.clr }}>{c.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom nav */}
        <div className="flex justify-between items-center pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          <Link href="/" className="btn-ghost text-sm gap-2">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Kembali ke Dashboard
          </Link>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            SentiScope · UNPAM Data Mining · 2025
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ n, color, icon, title }: { n:string; color:string; icon:string; title:string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
           style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <span className="text-xs font-black font-mono" style={{ color }}>FASE {n}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <h2 className="text-xl font-extrabold" style={{ color: "var(--text-primary)" }}>{title}</h2>
    </div>
  );
}

function Stat({ label, value, color }: { label:string; value:string; color:string }) {
  return (
    <div className="rounded-lg p-3 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-base font-black" style={{ color }}>{value}</p>
    </div>
  );
}

function Step({ n, text, color }: { n:number; text:string; color:string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0"
            style={{ background: `${color}25`, color }}>
        {n}
      </span>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{text}</p>
    </div>
  );
}
