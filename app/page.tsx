"use client";

/**
 * app/page.tsx – Sentiment Analysis Dashboard (Client Component)
 * ─────────────────────────────────────────────────────────────────────────────
 * Dashboard interaktif untuk analisis sentimen komentar Facebook.
 *
 * Model yang tersedia:
 *   • IndoBERTweet      — SAMA dengan sentimen_analisis.py (IndoBERTweet + nusantara-nlp)
 *   • InSet Lexicon (ID)— lexicon Bahasa Indonesia (slang, emoji, Jawa)
 *   • Rule-Based (ID)   — InSet + penanganan negasi & intensifier
 *   • VADER             — Perbandingan (lexicon English)
 *   • TextBlob          — Perbandingan (AFINN English)
 *
 * Label sentimen konsisten dalam Bahasa Indonesia: Positif | Netral | Negatif
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import CommentList, { type CommentItem } from "@/components/CommentList";

const PieChart   = dynamic(() => import("@/components/charts/PieChart"),  { ssr: false });
const LineChart  = dynamic(() => import("@/components/charts/LineChart"), { ssr: false });
const BarChart   = dynamic(() => import("@/components/charts/BarChart"),  { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────
interface Distribution {
  Positif: number;
  Netral: number;
  Negatif: number;
}

interface TimeSeriesPoint {
  date: string;
  Positif: number;
  Netral: number;
  Negatif: number;
}

interface WordEntry {
  word: string;
  count: number;
}

interface Aggregates {
  distribution: Distribution;
  timeSeries: TimeSeriesPoint[];
  topWords: WordEntry[];
  totalComments: number;
  averageScore: number;
}

interface SentimentData {
  model: string;
  modelDescription: string;
  aggregates: Aggregates;
  totalComments: number;
}

interface StatsData {
  totalComments: number;
  dateRange: { from: string | null; to: string | null };
  averageReactions: number;
  totalReactions: number;
}

type ModelId = "indobertweet" | "mbert_js" | "indonesia_lexicon" | "rule_based_id" | "vader" | "textblob";

const MODELS: { id: ModelId; label: string; desc: string; badge: string; badgeColor: string; slow?: boolean }[] = [
  {
    id: "indobertweet",
    label: "IndoBERTweet",
    desc: "IndoBERTweet + nusantara-nlp — Sama persis dengan sentimen_analisis.py",
    badge: "🏆 Model Utama",
    badgeColor: "bg-green-500/20 text-green-300",
  },
  {
    id: "mbert_js",
    label: "mBERT JS (Xenova)",
    desc: "BERT Multilingual via @xenova/transformers — Transformer JS, tanpa Python. ⚠️ Pertama kali lambat (~5 menit)",
    badge: "🔬 JS Transformer",
    badgeColor: "bg-purple-500/20 text-purple-300",
    slow: true,
  },
  {
    id: "indonesia_lexicon",
    label: "InSet Lexicon (ID)",
    desc: "Lexicon Bahasa Indonesia — Mendukung slang, emoji, bahasa Jawa/daerah",
    badge: "📖 Bahasa Indonesia",
    badgeColor: "bg-pink-500/20 text-pink-300",
  },
  {
    id: "rule_based_id",
    label: "Rule-Based (ID)",
    desc: "InSet + penanganan negasi (tidak/bukan/gak) dan intensifier (sangat/banget)",
    badge: "⚙️ Bahasa Indonesia",
    badgeColor: "bg-indigo-500/20 text-indigo-300",
  },
  {
    id: "vader",
    label: "VADER",
    desc: "VADER Lexicon (English) — Untuk perbandingan",
    badge: "🔤 Perbandingan EN",
    badgeColor: "bg-slate-500/20 text-slate-400",
  },
  {
    id: "textblob",
    label: "TextBlob / AFINN",
    desc: "AFINN-based polarity score (English) — Untuk perbandingan",
    badge: "📊 Perbandingan EN",
    badgeColor: "bg-slate-500/20 text-slate-400",
  },
];

function formatDate(iso: string | null): string {
  if (!iso) return "–";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

// ── Dashboard Component ───────────────────────────────────────────────────────
export default function Dashboard() {
  const [model, setModel]   = useState<ModelId>("indobertweet");
  const [data, setData]     = useState<SentimentData | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [stats, setStats]   = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Fetch overview stats (sekali)
  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  // Fetch sentiment data saat model berubah
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/sentiment?model=${model}`)
      .then((r) => { if (!r.ok) throw new Error("API error " + r.status); return r.json(); })
      .then((json) => {
        setData(json);
        setComments(json.comments ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [model]);

  const exportCSV = useCallback(() => {
    const link = document.createElement("a");
    link.href = `/api/sentiment?model=${model}&export=csv`;
    link.download = `sentiment_${model}.csv`;
    link.click();
  }, [model]);

  const exportPNG = useCallback(async () => {
    if (!dashboardRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(dashboardRef.current, { backgroundColor: "#0a0f1e" });
    const link = document.createElement("a");
    link.download = `dashboard_${model}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [model]);

  const agg = data?.aggregates;
  const totalSentiment = agg
    ? (agg.distribution.Positif + agg.distribution.Netral + agg.distribution.Negatif)
    : 0;
  const pct = (n: number) =>
    totalSentiment > 0 ? ((n / totalSentiment) * 100).toFixed(1) + "%" : "–";

  const currentModel = MODELS.find((m) => m.id === model)!;

  return (
    <div className="min-h-screen bg-hero-gradient" ref={dashboardRef}>
      {/* Decorative blobs */}
      <div className="fixed top-0 right-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
           style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }} />
      <div className="fixed bottom-0 left-0 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
           style={{ background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="mb-10 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-1">
                UNPAM · Data Mining · Facebook Sentiment
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Sentiment Analysis Dashboard
              </h1>
              <p className="mt-1 text-slate-400">
                Analisis komentar Facebook Reel menggunakan IndoBERTweet + nusantara-nlp
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button onClick={exportCSV}
                className="btn-secondary flex items-center gap-2 text-sm"
                id="btn-export-csv" title="Download hasil sebagai CSV">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              <button onClick={exportPNG}
                className="btn-primary flex items-center gap-2 text-sm"
                id="btn-export-png" title="Screenshot dashboard">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Export PNG
              </button>
              <Link href="/penjelasan" className="btn-secondary flex items-center gap-2 text-sm border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Penjelasan Metode
              </Link>
            </div>
          </div>
        </header>

        {/* ── Stat Cards ──────────────────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-slide-up">
            {[
              { label: "Total Komentar", value: stats.totalComments.toLocaleString("id-ID"), icon: "💬" },
              { label: "Total Reaksi",   value: stats.totalReactions.toLocaleString("id-ID"),  icon: "👍" },
              { label: "Rata-rata Reaksi", value: stats.averageReactions.toFixed(1),           icon: "📊" },
              { label: "Periode Data",   value: formatDate(stats.dateRange.from), sub: formatDate(stats.dateRange.to), icon: "📅" },
            ].map((card, i) => (
              <div key={i} className="glass-card p-4">
                <p className="text-2xl mb-1">{card.icon}</p>
                <p className="text-xl font-bold text-white">{card.value}</p>
                {"sub" in card && <p className="text-xs text-slate-400">s.d {card.sub}</p>}
                <p className="text-xs text-slate-400 mt-1">{card.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Model Switcher ──────────────────────────────────────────────────── */}
        <section className="glass-card p-5 mb-8 animate-slide-up">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-1">
            Pilih Model Analisis
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Model <span className="text-green-400 font-semibold">IndoBERTweet</span> menggunakan hasil yang sama persis dengan{" "}
            <code className="text-green-400">sentimen_analisis.py</code>.
            Model <span className="text-pink-400 font-semibold">InSet</span> dan{" "}
            <span className="text-indigo-400 font-semibold">Rule-Based</span> mendukung bahasa Indonesia, slang, emoji, dan bahasa daerah.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {MODELS.map((m) => (
              <button id={`model-btn-${m.id}`} key={m.id} onClick={() => setModel(m.id)}
                className={`p-4 rounded-xl text-left transition-all duration-200 border ${
                  model === m.id
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-bold text-sm">{m.label}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    model === m.id ? "bg-white/20 text-white" : m.badgeColor
                  }`}>
                    {m.badge}
                  </span>
                </div>
                <p className={`text-xs ${model === m.id ? "text-blue-200" : "text-slate-500"}`}>
                  {m.desc}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* ── Loading ─────────────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400">Memuat hasil analisis model {currentModel.label}…</p>
            {model === "mbert_js" && (
              <div className="glass-card p-5 max-w-md text-center border border-purple-500/30 bg-purple-500/5">
                <p className="text-purple-300 font-bold mb-2">🔬 JS Transformer Sedang Berjalan</p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Model <strong>mBERT via @xenova/transformers</strong> sedang menjalankan
                  inference langsung di Next.js (tanpa Python).
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  ⏳ Pertama kali butuh <strong className="text-white">5–15 menit</strong> (download model ~170MB + inference).
                  Request berikutnya akan <strong className="text-purple-300">instan</strong> karena hasil tersimpan di disk cache.
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="glass-card p-6 text-center text-red-400 animate-fade-in">
            <p className="text-lg font-semibold">⚠ Error</p>
            <p className="text-sm mt-1">{error}</p>
            {model === "indobertweet" && (
              <p className="text-xs text-slate-500 mt-3">
                Pastikan <code>hasil_sentimen_fb.csv</code> sudah ada di{" "}
                <code>dashboard/public/data/</code>.<br />
                Jalankan <code className="text-green-400">py sentimen_analisis.py</code> terlebih dahulu,
                kemudian salin outputnya ke folder tersebut.
              </p>
            )}
          </div>
        )}

        {/* ── Charts ──────────────────────────────────────────────────────────── */}
        {!loading && !error && agg && (
          <>
            {/* ── Sentiment Summary Cards with Progress Bars ─────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-slide-up">
              {([
                {
                  key: "Positif" as const,
                  icon: "😊",
                  label: "Sentimen Positif",
                  sublabel: "Komentar yang mengandung ekspresi setuju, apresiasi, atau dukungan",
                  color: "text-green-400",
                  barColor: "bg-green-500",
                  bg: "bg-green-500/8 border-green-500/25",
                  glow: "shadow-green-500/10",
                },
                {
                  key: "Netral" as const,
                  icon: "😐",
                  label: "Sentimen Netral",
                  sublabel: "Komentar tanpa polaritas jelas — informasi, pertanyaan, pernyataan umum",
                  color: "text-yellow-400",
                  barColor: "bg-yellow-400",
                  bg: "bg-yellow-500/8 border-yellow-500/25",
                  glow: "shadow-yellow-500/10",
                },
                {
                  key: "Negatif" as const,
                  icon: "😞",
                  label: "Sentimen Negatif",
                  sublabel: "Komentar yang mengandung keluhan, kritik, kekecewaan, atau penolakan",
                  color: "text-red-400",
                  barColor: "bg-red-500",
                  bg: "bg-red-500/8 border-red-500/25",
                  glow: "shadow-red-500/10",
                },
              ] as const).map(({ key, icon, label, sublabel, color, barColor, bg, glow }) => {
                const count = agg.distribution[key];
                const percentage = totalSentiment > 0 ? (count / totalSentiment) * 100 : 0;
                return (
                  <div key={key} className={`glass-card p-5 border ${bg} shadow-lg ${glow}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{icon}</span>
                        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>
                      </div>
                      <span className={`text-2xl font-black ${color}`}>{percentage.toFixed(1)}%</span>
                    </div>
                    <p className={`text-3xl font-black ${color} mb-1`}>
                      {count.toLocaleString("id-ID")}
                    </p>
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">{sublabel}</p>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-800/60 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-out`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 text-right">
                      {count.toLocaleString("id-ID")} dari {totalSentiment.toLocaleString("id-ID")} komentar
                    </p>
                  </div>
                );
              })}
            </div>

            {/* ── Sentiment Health Meter ─────────────────────────────────────── */}
            <div className="glass-card p-5 mb-6 animate-slide-up">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-1">
                    📊 Indikator Kesehatan Sentimen
                  </h3>
                  <p className="text-xs text-slate-500">
                    Visualisasi proporsi sentimen secara linier. Semakin hijau → semakin positif persepsi publik.
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">Rata-rata Skor Sentimen</p>
                  <p className={`text-2xl font-black ${
                    agg.averageScore > 0.05 ? "text-green-400" : agg.averageScore < -0.05 ? "text-red-400" : "text-yellow-400"
                  }`}>
                    {agg.averageScore > 0 ? "+" : ""}{agg.averageScore.toFixed(4)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {agg.averageScore > 0.05 ? "🟢 Cenderung Positif" : agg.averageScore < -0.05 ? "🔴 Cenderung Negatif" : "🟡 Cenderung Netral"}
                  </p>
                </div>
              </div>
              {/* Stacked proportion bar */}
              <div className="mt-4 w-full h-5 flex rounded-xl overflow-hidden gap-px bg-slate-900">
                {([
                  { key: "Positif" as const, color: "bg-green-500" },
                  { key: "Netral" as const, color: "bg-yellow-400" },
                  { key: "Negatif" as const, color: "bg-red-500" },
                ] as const).map(({ key, color }) => {
                  const w = totalSentiment > 0 ? (agg.distribution[key] / totalSentiment) * 100 : 0;
                  return (
                    <div
                      key={key}
                      className={`${color} h-full transition-all duration-1000 ease-out first:rounded-l-xl last:rounded-r-xl`}
                      style={{ width: `${w}%` }}
                      title={`${key}: ${w.toFixed(1)}%`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1.5 px-0.5">
                <span className="text-green-400 font-medium">😊 Positif {pct(agg.distribution.Positif)}</span>
                <span className="text-yellow-400 font-medium">😐 Netral {pct(agg.distribution.Netral)}</span>
                <span className="text-red-400 font-medium">😞 Negatif {pct(agg.distribution.Negatif)}</span>
              </div>
            </div>

            {/* ── Pie + Line Charts ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6 animate-slide-up">
              {/* Doughnut */}
              <div className="glass-card p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-1">
                  🍩 Distribusi Sentimen
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Proporsi tiap label dalam total <span className="text-white font-semibold">{totalSentiment.toLocaleString("id-ID")}</span> komentar yang dianalisis
                </p>
                <PieChart distribution={agg.distribution} />
              </div>

              {/* Line Chart */}
              <div className="glass-card p-5 lg:col-span-3">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-1">
                  📈 Tren Sentimen dari Waktu ke Waktu
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Jumlah komentar per tanggal, dipecah berdasarkan label sentimen. Hover untuk detail tiap hari.
                </p>
                <LineChart timeSeries={agg.timeSeries} />
              </div>
            </div>

            {/* ── Bar Chart: Top Words ─────────────────────────────────────── */}
            <div className="glass-card p-5 mb-6 animate-slide-up">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-1">
                    🏆 Top 20 Kata Paling Sering Muncul
                  </h3>
                  <p className="text-xs text-slate-500">
                    {model === "indobertweet"
                      ? <>Dihitung dari kolom <code className="text-green-400">Teks_Bersih</code> — hasil preprocessing nusantara-nlp (stopword & normalisasi slang sudah dihapus)</>
                      : "Dihitung setelah preprocessing (stopword & slang normalization) — menunjukkan kata bermakna yang paling dominan"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs text-slate-500">Total kata unik</span>
                  <p className="text-lg font-bold text-white">{agg.topWords.length.toLocaleString("id-ID")}</p>
                </div>
              </div>
              <BarChart topWords={agg.topWords} />
            </div>

            {/* ── Model Description Footer ─────────────────────────────────── */}
            <div className="glass-card p-5 animate-fade-in border border-blue-500/20 bg-blue-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Model Aktif</p>
                  <p className="text-lg font-bold text-white">{currentModel.label}</p>
                  <p className="text-xs text-slate-400 mt-1">{data?.modelDescription}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Komentar</p>
                    <p className="text-xl font-black text-white">{totalSentiment.toLocaleString("id-ID")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Avg Score</p>
                    <p className={`text-xl font-black ${
                      agg.averageScore > 0 ? "text-green-400" : agg.averageScore < 0 ? "text-red-400" : "text-yellow-400"
                    }`}>
                      {agg.averageScore > 0 ? "+" : ""}{agg.averageScore.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Dominan</p>
                    <p className={`text-xl font-black ${
                      agg.distribution.Positif >= agg.distribution.Negatif && agg.distribution.Positif >= agg.distribution.Netral
                        ? "text-green-400"
                        : agg.distribution.Negatif >= agg.distribution.Positif && agg.distribution.Negatif >= agg.distribution.Netral
                        ? "text-red-400"
                        : "text-yellow-400"
                    }`}>
                      {agg.distribution.Positif >= agg.distribution.Negatif && agg.distribution.Positif >= agg.distribution.Netral
                        ? "😊 Positif"
                        : agg.distribution.Negatif >= agg.distribution.Positif && agg.distribution.Negatif >= agg.distribution.Netral
                        ? "😞 Negatif"
                        : "😐 Netral"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Comment List with Tabs ────────────────────────────────────── */}
            <div className="mt-8">
              <CommentList comments={comments} model={model} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
