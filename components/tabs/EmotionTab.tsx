"use client";

import { useState, useMemo } from "react";
import type { SentimentResult } from "@/lib/sentimentEngine";
import { aggregateEmotions, EMOTION_LABELS, EMOTION_COLORS, type EmotionKey } from "@/lib/emotionLexicon";
import { computeNGrams } from "@/lib/textMining";

interface Props {
  comments: SentimentResult[];
}

export default function EmotionTab({ comments }: Props) {
  const [analyzed, setAnalyzed] = useState(false);

  const texts = useMemo(() => comments.map((c) => c.Teks_Bersih || c.text), [comments]);
  const emotions = useMemo(() => analyzed ? aggregateEmotions(texts) : null, [analyzed, texts]);
  const total = emotions ? (Object.values(emotions).reduce((s, v) => s + v, 0) || 1) : 1;

  const emotionKeys = Object.keys(EMOTION_LABELS) as EmotionKey[];
  const sorted = emotions ? [...emotionKeys].sort((a, b) => (emotions[b] ?? 0) - (emotions[a] ?? 0)) : emotionKeys;

  const topEmotion = emotions ? sorted[0] : null;

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── Info ──────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-title mb-1">Analisis Emosi 8-Dimensi</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Mengklasifikasikan teks ke dalam 8 emosi dasar Ekman menggunakan kamus emosi Bahasa Indonesia.
              Setiap komentar dapat mengandung lebih dari satu emosi.
            </p>
          </div>
          {!analyzed && (
            <button onClick={() => setAnalyzed(true)} className="btn-primary shrink-0">
              🎭 Jalankan Analisis Emosi
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {emotionKeys.map((k) => (
            <span key={k} className="badge text-white text-xs"
                  style={{ background: EMOTION_COLORS[k] }}>
              {EMOTION_LABELS[k].split(" / ")[0]}
            </span>
          ))}
        </div>
      </div>

      {!analyzed && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-5xl">🎭</span>
          <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Klik tombol di atas untuk memulai analisis emosi</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Proses berlangsung di browser — tidak perlu koneksi tambahan</p>
        </div>
      )}

      {analyzed && emotions && (
        <>
          {/* ── Top emotion ─────────────────────────────── */}
          {topEmotion && (
            <div className="card p-5 text-center" style={{ borderColor: EMOTION_COLORS[topEmotion], background: `${EMOTION_COLORS[topEmotion]}15` }}>
              <p className="section-title mb-2">Emosi Dominan</p>
              <p className="text-4xl font-black mb-1" style={{ color: EMOTION_COLORS[topEmotion] }}>
                {EMOTION_LABELS[topEmotion]}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {emotions[topEmotion].toLocaleString("id-ID")} kemunculan · {((emotions[topEmotion] / total) * 100).toFixed(1)}% dari seluruh sinyal emosi
              </p>
            </div>
          )}

          {/* ── Radar chart (SVG-based) ─────────────────── */}
          <div className="card p-5">
            <p className="section-title mb-4">Radar Emosi</p>
            <div className="flex justify-center">
              <EmotionRadar emotions={emotions} />
            </div>
          </div>

          {/* ── Bar chart ───────────────────────────────── */}
          <div className="card p-5">
            <p className="section-title mb-4">Distribusi Semua Emosi</p>
            <div className="space-y-3">
              {sorted.map((key) => {
                const count = emotions[key] ?? 0;
                const pct   = (count / total) * 100;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: EMOTION_COLORS[key] }}>
                        {EMOTION_LABELS[key]}
                      </span>
                      <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                        {count.toLocaleString()} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                           style={{ width: `${pct}%`, background: EMOTION_COLORS[key] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Catatan metodologi ──────────────────────── */}
          <div className="card p-4" style={{ background: "var(--bg-input)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>📌 Catatan Metodologi</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Analisis emosi ini menggunakan pendekatan <strong>lexicon-based</strong> dengan kamus emosi Indonesia yang terinspirasi dari kerangka NRC Emotion Lexicon.
              Setiap kata dalam teks dicocokkan dengan kamus dan diberi label emosi. Satu kata dapat berkontribusi pada lebih dari satu emosi.
              Analisis ini bersifat kualitatif dan tidak dapat menangkap sarkasme atau konteks kompleks.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function EmotionRadar({ emotions }: { emotions: Record<EmotionKey, number> }) {
  const keys = Object.keys(EMOTION_LABELS) as EmotionKey[];
  const n    = keys.length;
  const R    = 110;
  const cx   = 130, cy = 130;
  const max  = Math.max(...keys.map((k) => emotions[k]), 1);

  function polarToXY(angle: number, radius: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const axes = keys.map((k, i) => ({ key: k, angle: (i / n) * 360 }));

  const points = axes.map(({ key, angle }) => {
    const r = (emotions[key] / max) * R;
    return polarToXY(angle, r);
  });

  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={260} height={260} viewBox="0 0 260 260">
      {/* Grid circles */}
      {gridLevels.map((level) => {
        const gridPoints = axes.map(({ angle }) => polarToXY(angle, R * level));
        const d = gridPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
        return <path key={level} d={d} fill="none" stroke="var(--border)" strokeWidth={0.8} />;
      })}

      {/* Axis lines */}
      {axes.map(({ angle, key }) => {
        const end = polarToXY(angle, R);
        return <line key={key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="var(--border)" strokeWidth={0.8} />;
      })}

      {/* Data polygon */}
      <path
        d={points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z"}
        fill="rgba(59,130,246,0.2)"
        stroke="#3b82f6"
        strokeWidth={2}
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={EMOTION_COLORS[axes[i].key]} />
      ))}

      {/* Labels */}
      {axes.map(({ angle, key }) => {
        const label = polarToXY(angle, R + 18);
        const short = EMOTION_LABELS[key].split(" / ")[0];
        return (
          <text key={key} x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central"
                fontSize={9} fill={EMOTION_COLORS[key]} fontWeight="bold">
            {short}
          </text>
        );
      })}
    </svg>
  );
}
