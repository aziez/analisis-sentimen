"use client";

import { useState, useMemo } from "react";
import type { SentimentResult } from "@/lib/sentimentEngine";
import {
  computeWordCloud, computeNGrams, computeTFIDF, computeLexicalDiversity,
} from "@/lib/textMining";

interface Props {
  comments: SentimentResult[];
}

type WcFilter = "all" | "Positif" | "Negatif" | "Netral";
type NGramN   = 1 | 2 | 3;

function WordCloud({ words }: { words: { word: string; count: number }[] }) {
  if (!words.length) return <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Tidak ada data</p>;
  const max = words[0].count;
  const COLORS = ["#3b82f6","#22c55e","#a855f7","#f97316","#06b6d4","#ec4899","#eab308","#84cc16"];
  return (
    <div className="flex flex-wrap gap-2 justify-center py-4">
      {words.map((w, i) => {
        const ratio = w.count / max;
        const size  = Math.round(12 + ratio * 24);
        const color = COLORS[i % COLORS.length];
        return (
          <span key={w.word} title={`${w.word}: ${w.count}×`}
            className="cursor-default transition-opacity hover:opacity-70 select-none font-semibold"
            style={{ fontSize: size, color, opacity: 0.55 + ratio * 0.45 }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
}

function HBarChart({ items, color }: { items: { label: string; value: number }[]; color: string }) {
  if (!items.length) return <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Tidak ada data</p>;
  const max = items[0].value;
  return (
    <div className="space-y-1.5">
      {items.slice(0, 20).map(({ label, value }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-xs w-32 text-right truncate shrink-0" style={{ color: "var(--text-secondary)" }} title={label}>
            {label}
          </span>
          <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: "var(--border)" }}>
            <div className="h-full rounded flex items-center px-1.5 transition-all duration-500"
                 style={{ width: `${(value / max) * 100}%`, background: color, minWidth: 20 }}>
              <span className="text-white text-xs font-bold">{value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const WC_COLORS: Record<string, string> = {
  all:     "#3b82f6",
  Positif: "#22c55e",
  Negatif: "#ef4444",
  Netral:  "#eab308",
};

const WC_LABELS: Record<string, string> = {
  all: "Semua", Positif: "Positif", Negatif: "Negatif", Netral: "Netral",
};

export default function TextMiningTab({ comments }: Props) {
  const [wcFilter,  setWcFilter]  = useState<WcFilter>("all");
  const [ngramN,    setNgramN]    = useState<NGramN>(1);

  const texts = useMemo(() => comments.map((c) => c.Teks_Bersih || c.text), [comments]);

  const wcWords = useMemo(() => computeWordCloud(comments, wcFilter === "all" ? undefined : wcFilter, 60), [comments, wcFilter]);
  const ngrams  = useMemo(() => computeNGrams(texts, ngramN, 20), [texts, ngramN]);
  const tfidfP  = useMemo(() => computeTFIDF(comments, "Positif"),  [comments]);
  const tfidfNe = useMemo(() => computeTFIDF(comments, "Negatif"),  [comments]);
  const tfidfNt = useMemo(() => computeTFIDF(comments, "Netral"),   [comments]);
  const lex     = useMemo(() => computeLexicalDiversity(texts), [texts]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── Lexical Diversity ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Token",   value: lex.totalTokens.toLocaleString("id-ID"),   icon: "🔢" },
          { label: "Token Unik",    value: lex.uniqueTokens.toLocaleString("id-ID"),   icon: "📚" },
          { label: "TTR",           value: lex.ttr.toFixed(4),                         icon: "📐", desc: "Type-Token Ratio" },
          { label: "Rata Pjg Kata", value: `${lex.avgWordLength} kar`,                 icon: "📏" },
          { label: "Rata Pjg Teks", value: `${lex.avgTextLength} kata`,                icon: "📝", desc: "per komentar" },
        ].map(({ label, value, icon, desc }) => (
          <div key={label} className="card p-4 text-center">
            <span className="text-2xl">{icon}</span>
            <p className="text-lg font-black mt-1" style={{ color: "var(--text-primary)" }}>{value}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
            {desc && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{desc}</p>}
          </div>
        ))}
      </div>

      {/* ── Word Cloud ──────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="section-title mb-0.5">Word Cloud</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Kata-kata paling dominan setelah preprocessing
            </p>
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
            {(["all","Positif","Negatif","Netral"] as WcFilter[]).map((f) => (
              <button key={f} onClick={() => setWcFilter(f)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                style={wcFilter === f ? { background: WC_COLORS[f], color: "#fff" } : { color: "var(--text-secondary)" }}
              >
                {WC_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
        <WordCloud words={wcWords} />
      </div>

      {/* ── N-Gram Analysis ─────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="section-title mb-0.5">N-Gram Analysis</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Frekuensi frasa paling dominan dalam keseluruhan komentar
            </p>
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-input)", border: "1px solid var(--border)" }}>
            {([1, 2, 3] as NGramN[]).map((n) => (
              <button key={n} onClick={() => setNgramN(n)}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                style={ngramN === n ? { background: "var(--clr-primary)", color: "#fff" } : { color: "var(--text-secondary)" }}
              >
                {["Unigram", "Bigram", "Trigram"][n - 1]}
              </button>
            ))}
          </div>
        </div>
        <HBarChart
          items={ngrams.map((g) => ({ label: g.phrase, value: g.count }))}
          color="var(--clr-primary)"
        />
      </div>

      {/* ── TF-IDF Keywords ─────────────────────────────── */}
      <div>
        <p className="section-title mb-3">TF-IDF Keywords per Sentimen</p>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Kata paling representatif per kategori (bukan hanya frekuensi — diperhitungkan terhadap distribusi keseluruhan)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Positif", data: tfidfP,  color: "var(--clr-positive)", bg: "var(--clr-positive-bg)", border: "var(--clr-positive-border)" },
            { label: "Negatif", data: tfidfNe, color: "var(--clr-negative)", bg: "var(--clr-negative-bg)", border: "var(--clr-negative-border)" },
            { label: "Netral",  data: tfidfNt, color: "var(--clr-neutral)",  bg: "var(--clr-neutral-bg)",  border: "var(--clr-neutral-border)"  },
          ].map(({ label, data, color, bg, border }) => (
            <div key={label} className="card p-4" style={{ background: bg, borderColor: border }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color }}>
                {label} — Top Keywords
              </p>
              {data.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Tidak ada data</p>
              ) : (
                <div className="space-y-1.5">
                  {data.map((kw, i) => (
                    <div key={kw.word} className="flex items-center gap-2">
                      <span className="text-xs w-4 shrink-0 font-bold" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                      <span className="text-xs font-semibold flex-1 truncate" style={{ color: "var(--text-primary)" }}>{kw.word}</span>
                      <span className="text-xs" style={{ color }}>{kw.count}×</span>
                      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{kw.tfidf.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
