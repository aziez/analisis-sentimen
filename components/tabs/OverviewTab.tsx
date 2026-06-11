"use client";

import dynamic from "next/dynamic";
import type { SentimentResult } from "@/lib/sentimentEngine";
import type { Aggregates } from "@/lib/sentimentEngine";
import { computeConfidenceHistogram } from "@/lib/textMining";

const PieChart  = dynamic(() => import("@/components/charts/PieChart"),  { ssr: false });
const LineChart = dynamic(() => import("@/components/charts/LineChart"), { ssr: false });
const BarChart  = dynamic(() => import("@/components/charts/BarChart"),  { ssr: false });

interface Props {
  aggregates: Aggregates;
  comments: SentimentResult[];
  model: string;
  modelDescription: string;
  theme: "dark" | "light";
}

const SENTIMENT_CONF = [
  {
    key: "Positif" as const,
    icon: "😊", label: "Positif",
    desc: "Komentar mengandung apresiasi, dukungan, atau ekspresi positif",
    color: "var(--clr-positive)", bg: "var(--clr-positive-bg)", border: "var(--clr-positive-border)",
    bar: "#22c55e",
  },
  {
    key: "Netral" as const,
    icon: "😐", label: "Netral",
    desc: "Komentar bersifat informatif, pertanyaan, atau netral tanpa polaritas jelas",
    color: "var(--clr-neutral)", bg: "var(--clr-neutral-bg)", border: "var(--clr-neutral-border)",
    bar: "#eab308",
  },
  {
    key: "Negatif" as const,
    icon: "😞", label: "Negatif",
    desc: "Komentar mengandung keluhan, kritik, kekecewaan, atau ekspresi negatif",
    color: "var(--clr-negative)", bg: "var(--clr-negative-bg)", border: "var(--clr-negative-border)",
    bar: "#ef4444",
  },
];

export default function OverviewTab({ aggregates, comments, model, modelDescription, theme }: Props) {
  const { distribution, timeSeries, topWords, totalComments, averageScore } = aggregates;
  const total = distribution.Positif + distribution.Netral + distribution.Negatif;
  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : "0");

  const histogram = computeConfidenceHistogram(comments);

  const dominant = (() => {
    if (distribution.Positif >= distribution.Negatif && distribution.Positif >= distribution.Netral) return "Positif";
    if (distribution.Negatif >= distribution.Positif && distribution.Negatif >= distribution.Netral) return "Negatif";
    return "Netral";
  })();

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── Model Info ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl"
           style={{ background: "var(--clr-primary-bg)", border: "1px solid rgba(59,130,246,0.25)" }}>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: "var(--clr-primary)" }}>
            Model Aktif
          </p>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{modelDescription}</p>
        </div>
        <div className="flex gap-5 shrink-0 text-center">
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total</p>
            <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{total.toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Avg Score</p>
            <p className="text-xl font-black" style={{ color: averageScore > 0.05 ? "var(--clr-positive)" : averageScore < -0.05 ? "var(--clr-negative)" : "var(--clr-neutral)" }}>
              {averageScore > 0 ? "+" : ""}{averageScore.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Dominan</p>
            <p className="text-xl font-black" style={{ color: dominant === "Positif" ? "var(--clr-positive)" : dominant === "Negatif" ? "var(--clr-negative)" : "var(--clr-neutral)" }}>
              {dominant}
            </p>
          </div>
        </div>
      </div>

      {/* ── Sentiment Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SENTIMENT_CONF.map(({ key, icon, label, desc, color, bg, border, bar }) => {
          const count = distribution[key];
          const p = parseFloat(pct(count));
          return (
            <div key={key} className="card p-5" style={{ background: bg, borderColor: border }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
                </div>
                <span className="text-2xl font-black" style={{ color }}>{p.toFixed(1)}%</span>
              </div>
              <p className="text-3xl font-black mb-1" style={{ color }}>{count.toLocaleString("id-ID")}</p>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>{desc}</p>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: bar }} />
              </div>
              <p className="text-xs text-right mt-1" style={{ color: "var(--text-muted)" }}>
                {count.toLocaleString()} / {total.toLocaleString()} komentar
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Health Meter ─────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="flex-1">
            <p className="section-title mb-1">Indikator Kesehatan Sentimen</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Proporsi linier — semakin hijau, semakin positif persepsi publik terhadap topik ini
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black" style={{ color: averageScore > 0.05 ? "var(--clr-positive)" : averageScore < -0.05 ? "var(--clr-negative)" : "var(--clr-neutral)" }}>
              {averageScore > 0 ? "+" : ""}{averageScore.toFixed(4)}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {averageScore > 0.05 ? "🟢 Cenderung Positif" : averageScore < -0.05 ? "🔴 Cenderung Negatif" : "🟡 Cenderung Netral"}
            </p>
          </div>
        </div>
        <div className="flex h-4 rounded-full overflow-hidden gap-px" style={{ background: "var(--bg-input)" }}>
          {[
            { key: "Positif" as const, color: "#22c55e" },
            { key: "Netral"  as const, color: "#eab308" },
            { key: "Negatif" as const, color: "#ef4444" },
          ].map(({ key, color }) => {
            const w = total > 0 ? (distribution[key] / total) * 100 : 0;
            return (
              <div key={key} className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full"
                   style={{ width: `${w}%`, background: color }} title={`${key}: ${w.toFixed(1)}%`} />
            );
          })}
        </div>
        <div className="flex justify-between text-xs mt-1.5 px-0.5">
          <span style={{ color: "var(--clr-positive)" }}>😊 Positif {pct(distribution.Positif)}%</span>
          <span style={{ color: "var(--clr-neutral)"  }}>😐 Netral  {pct(distribution.Netral)}%</span>
          <span style={{ color: "var(--clr-negative)" }}>😞 Negatif {pct(distribution.Negatif)}%</span>
        </div>
      </div>

      {/* ── Pie + Line Charts ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="card p-5 lg:col-span-2">
          <p className="section-title mb-1">Distribusi Sentimen</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Proporsi dari {total.toLocaleString()} komentar
          </p>
          <PieChart distribution={distribution} theme={theme} />
        </div>
        <div className="card p-5 lg:col-span-3">
          <p className="section-title mb-1">Tren Sentimen Waktu ke Waktu</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Jumlah komentar per tanggal berdasarkan label sentimen
          </p>
          <LineChart timeSeries={timeSeries} theme={theme} />
        </div>
      </div>

      {/* ── Top Words + Confidence Histogram ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <p className="section-title mb-1">Top 20 Kata Paling Sering</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Setelah preprocessing — stopword dan slang telah dinormalisasi
          </p>
          <BarChart topWords={topWords} theme={theme} />
        </div>
        <div className="card p-5">
          <p className="section-title mb-1">Distribusi Confidence</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Sebaran tingkat keyakinan model per rentang skor
          </p>
          {histogram.map((b) => (
            <div key={b.range} className="mb-1.5">
              <div className="flex justify-between text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>
                <span>{b.range}</span><span>{b.count}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full" style={{
                  width: `${totalComments > 0 ? (b.count / totalComments) * 100 : 0}%`,
                  background: "var(--clr-primary)",
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
