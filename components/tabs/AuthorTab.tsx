"use client";

import { useMemo, useState } from "react";
import type { SentimentResult } from "@/lib/sentimentEngine";
import { computeAuthorStats } from "@/lib/textMining";

interface Props {
  comments: SentimentResult[];
}

export default function AuthorTab({ comments }: Props) {
  const [sortField, setSortField] = useState<"total" | "avgScore" | "avgReactions">("total");
  const [sortDesc,  setSortDesc]  = useState(true);

  const stats = useMemo(() => {
    const raw = computeAuthorStats(comments, 30);
    return [...raw].sort((a, b) => {
      const v = sortDesc ? b[sortField] - a[sortField] : a[sortField] - b[sortField];
      return v;
    });
  }, [comments, sortField, sortDesc]);

  const scatter = useMemo(() => comments.map((c) => ({
    x: parseFloat(c.reaction_count ?? "0") || 0,
    y: Math.abs(c.score),
    label: c.label,
    text: (c.text ?? "").slice(0, 60),
  })).filter((p) => p.x > 0 || p.y > 0), [comments]);

  const maxX = Math.max(...scatter.map((p) => p.x), 1);
  const maxY = 1;

  const labelColor: Record<string, string> = {
    Positif: "var(--clr-positive)",
    Negatif: "var(--clr-negative)",
    Netral:  "var(--clr-neutral)",
  };

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDesc((d) => !d);
    else { setSortField(field); setSortDesc(true); }
  }

  const SortBtn = ({ field, label }: { field: typeof sortField; label: string }) => (
    <th className="px-4 py-3 text-right text-xs font-semibold cursor-pointer select-none hover:opacity-80"
        style={{ color: "var(--text-muted)" }} onClick={() => toggleSort(field)}>
      {label} {sortField === field ? (sortDesc ? "↓" : "↑") : ""}
    </th>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── Summary cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Penulis Unik", value: new Set(comments.map((c) => c.author_name)).size.toLocaleString("id-ID"), icon: "👥" },
          { label: "Penulis Paling Aktif", value: stats[0]?.author?.slice(0, 20) ?? "—", icon: "🏆" },
          { label: "Avg Reaksi",           value: stats.length > 0 ? (comments.reduce((s, c) => s + (parseFloat(c.reaction_count ?? "0") || 0), 0) / comments.length).toFixed(1) : "0", icon: "👍" },
          { label: "Rata Skor Sentimen",   value: (comments.reduce((s, c) => s + c.score, 0) / Math.max(1, comments.length)).toFixed(4), icon: "📊" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card p-4">
            <span className="text-2xl">{icon}</span>
            <p className="text-sm font-black mt-1 truncate" style={{ color: "var(--text-primary)" }} title={String(value)}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Author table ──────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="section-title mb-0.5">Top Penulis berdasarkan Aktivitas</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Distribusi sentimen per penulis — klik header kolom untuk mengurutkan
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Penulis</th>
                <SortBtn field="total" label="Total" />
                <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Positif</th>
                <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Netral</th>
                <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Negatif</th>
                <SortBtn field="avgScore" label="Avg Score" />
                <SortBtn field="avgReactions" label="Avg Reaksi" />
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Proporsi</th>
              </tr>
            </thead>
            <tbody>
              {stats.slice(0, 25).map((s) => {
                const score = s.avgScore;
                const scoreColor = score > 0.05 ? "var(--clr-positive)" : score < -0.05 ? "var(--clr-negative)" : "var(--clr-neutral)";
                return (
                  <tr key={s.author} style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                    <td className="px-4 py-3 text-xs font-semibold max-w-36 truncate" style={{ color: "var(--text-primary)" }} title={s.author}>
                      {s.author}
                    </td>
                    <td className="px-4 py-3 text-xs text-right font-bold" style={{ color: "var(--text-primary)" }}>{s.total}</td>
                    <td className="px-4 py-3 text-xs text-right" style={{ color: "var(--clr-positive)" }}>{s.positif}</td>
                    <td className="px-4 py-3 text-xs text-right" style={{ color: "var(--clr-neutral)"  }}>{s.netral}</td>
                    <td className="px-4 py-3 text-xs text-right" style={{ color: "var(--clr-negative)" }}>{s.negatif}</td>
                    <td className="px-4 py-3 text-xs text-right font-mono font-bold" style={{ color: scoreColor }}>
                      {score > 0 ? "+" : ""}{score.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-xs text-right" style={{ color: "var(--text-secondary)" }}>
                      {s.avgReactions.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 min-w-28">
                      <div className="flex h-3 rounded-full overflow-hidden gap-px">
                        {[
                          { v: s.positif, c: "#22c55e" },
                          { v: s.netral,  c: "#eab308" },
                          { v: s.negatif, c: "#ef4444" },
                        ].map(({ v, c }, i) => {
                          const w = s.total > 0 ? (v / s.total) * 100 : 0;
                          return w > 0 ? (
                            <div key={i} className="h-full" style={{ width: `${w}%`, background: c }} />
                          ) : null;
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Scatter: Confidence vs Reactions ─────────────── */}
      <div className="card p-5">
        <p className="section-title mb-0.5">Scatter: Keyakinan Model vs Jumlah Reaksi</p>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Apakah komentar yang lebih ekstrem (skor tinggi) mendapat lebih banyak reaksi?
        </p>
        <div className="relative overflow-hidden rounded-lg"
             style={{ height: 300, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
          {/* Axes labels */}
          <span className="absolute bottom-1 right-2 text-xs" style={{ color: "var(--text-muted)" }}>Reaksi →</span>
          <span className="absolute top-1 left-2 text-xs" style={{ color: "var(--text-muted)" }}>↑ Keyakinan</span>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((f) => (
            <div key={f} className="absolute w-full border-t" style={{ top: `${(1 - f) * 100}%`, borderColor: "var(--border)" }} />
          ))}
          {/* Dots */}
          {scatter.slice(0, 500).map((p, i) => {
            const cx = (p.x / maxX) * 96 + 2;
            const cy = (1 - p.y / maxY) * 92 + 4;
            return (
              <div key={i} title={`${p.label}: ${p.text}…`}
                   className="absolute rounded-full transition-transform hover:scale-150"
                   style={{
                     left:    `${cx}%`,
                     top:     `${cy}%`,
                     width:   6, height: 6,
                     background: labelColor[p.label] ?? "#888",
                     transform: "translate(-50%,-50%)",
                     opacity: 0.65,
                   }} />
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 justify-center">
          {["Positif","Netral","Negatif"].map((lbl) => (
            <div key={lbl} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: labelColor[lbl] }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
