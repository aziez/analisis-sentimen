"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { SentimentResult } from "@/lib/sentimentEngine";
import type { Aggregates } from "@/lib/sentimentEngine";

const LineChart = dynamic(() => import("@/components/charts/LineChart"), { ssr: false });

interface Props {
  aggregates: Aggregates;
  comments: SentimentResult[];
  theme: "dark" | "light";
}

function HeatmapCell({ count, max, label }: { count: number; max: number; label: string }) {
  const intensity = max > 0 ? count / max : 0;
  const bg = `rgba(59,130,246,${0.1 + intensity * 0.85})`;
  return (
    <div className="flex flex-col items-center justify-center rounded text-center transition-all"
         style={{ background: bg, minWidth: 36, height: 36 }} title={`${label}: ${count}`}>
      <span className="text-xs font-bold" style={{ color: intensity > 0.5 ? "#fff" : "var(--text-secondary)" }}>
        {count > 0 ? count : ""}
      </span>
    </div>
  );
}

export default function TemporalTab({ aggregates, comments, theme }: Props) {
  const DAYS  = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
  const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2,"0")}`);

  const heatmap = useMemo(() => {
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const c of comments) {
      if (!c.timestamp) continue;
      try {
        const d = new Date(c.timestamp);
        if (!isNaN(d.getTime())) {
          matrix[d.getDay()][d.getHours()]++;
        }
      } catch { /* skip */ }
    }
    return matrix;
  }, [comments]);

  const maxCell = useMemo(() => Math.max(...heatmap.flat()), [heatmap]);

  const byDayHour = useMemo(() => {
    const dayTotal = heatmap.map((row) => row.reduce((s, v) => s + v, 0));
    const hourTotal = HOURS.map((_, h) => heatmap.reduce((s, row) => s + row[h], 0));
    return { dayTotal, hourTotal };
  }, [heatmap]);

  const momentum = useMemo(() => {
    const ts = aggregates.timeSeries;
    if (ts.length < 2) return null;
    const first  = ts.slice(0, Math.ceil(ts.length / 2));
    const second = ts.slice(Math.ceil(ts.length / 2));
    const score = (arr: typeof ts) => {
      const total = arr.reduce((s, d) => s + d.Positif + d.Netral + d.Negatif, 0);
      const pos   = arr.reduce((s, d) => s + d.Positif, 0);
      return total > 0 ? pos / total : 0;
    };
    const diff = score(second) - score(first);
    return diff;
  }, [aggregates.timeSeries]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── Trend Line ─────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="section-title mb-0.5">Tren Sentimen per Tanggal</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Jumlah komentar per hari berdasarkan kategori sentimen
            </p>
          </div>
          {momentum !== null && (
            <div className="text-right">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Momentum</p>
              <p className="text-lg font-black"
                 style={{ color: momentum > 0 ? "var(--clr-positive)" : momentum < 0 ? "var(--clr-negative)" : "var(--clr-neutral)" }}>
                {momentum > 0.01 ? "📈 Membaik" : momentum < -0.01 ? "📉 Menurun" : "➡ Stabil"}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {momentum > 0 ? "+" : ""}{(momentum * 100).toFixed(1)}% dari paruh pertama ke kedua
              </p>
            </div>
          )}
        </div>
        <LineChart timeSeries={aggregates.timeSeries} theme={theme} />
      </div>

      {/* ── Hour × Day Heatmap ─────────────────────────────── */}
      <div className="card p-5">
        <p className="section-title mb-0.5">Heatmap Aktivitas Komentar</p>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Jumlah komentar berdasarkan jam dan hari — intensitas biru menunjukkan kepadatan
        </p>

        {maxCell === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            Data timestamp tidak tersedia untuk heatmap
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Hour labels */}
              <div className="flex gap-1 mb-1 ml-10">
                {HOURS.filter((_, i) => i % 3 === 0).map((h) => (
                  <div key={h} style={{ width: 36 * 3 + 8, color: "var(--text-muted)" }} className="text-center text-xs">{h}h</div>
                ))}
              </div>
              {/* Grid */}
              {heatmap.map((row, d) => (
                <div key={d} className="flex items-center gap-1 mb-1">
                  <span className="text-xs w-8 text-right shrink-0 font-medium" style={{ color: "var(--text-secondary)" }}>
                    {DAYS[d]}
                  </span>
                  {row.map((count, h) => (
                    <HeatmapCell key={h} count={count} max={maxCell} label={`${DAYS[d]} ${h}:00`} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Day of Week & Hour Bar Charts ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="section-title mb-3">Distribusi per Hari</p>
          {byDayHour.dayTotal.every((v) => v === 0) ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Tidak ada data timestamp</p>
          ) : (
            <div className="space-y-2">
              {DAYS.map((day, i) => {
                const count = byDayHour.dayTotal[i];
                const max   = Math.max(...byDayHour.dayTotal);
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs w-8 text-right shrink-0" style={{ color: "var(--text-secondary)" }}>{day}</span>
                    <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded flex items-center px-2 transition-all duration-500"
                           style={{ width: max > 0 ? `${(count / max) * 100}%` : "0%", background: "var(--clr-primary)", minWidth: count > 0 ? 20 : 0 }}>
                        {count > 0 && <span className="text-white text-xs font-bold">{count}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="card p-5">
          <p className="section-title mb-3">Distribusi per Jam</p>
          {byDayHour.hourTotal.every((v) => v === 0) ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Tidak ada data timestamp</p>
          ) : (
            <div className="space-y-1.5">
              {HOURS.filter((_, i) => i % 2 === 0).map((h, idx) => {
                const i     = idx * 2;
                const count = byDayHour.hourTotal[i] + (byDayHour.hourTotal[i + 1] ?? 0);
                const max   = Math.max(...byDayHour.hourTotal.filter((_, j) => j % 2 === 0).map((v, k) => v + (byDayHour.hourTotal[k * 2 + 1] ?? 0)));
                return (
                  <div key={h} className="flex items-center gap-2">
                    <span className="text-xs w-10 text-right shrink-0" style={{ color: "var(--text-secondary)" }}>{h}–{(i + 2).toString().padStart(2,"0")}</span>
                    <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded transition-all duration-500"
                           style={{ width: max > 0 ? `${(count / max) * 100}%` : "0%", background: "var(--clr-primary)" }} />
                    </div>
                    <span className="text-xs w-8" style={{ color: "var(--text-muted)" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
