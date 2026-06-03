"use client";

/**
 * components/CommentList.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Komponen daftar komentar dengan:
 *   • Tabs    : Semua | Positif | Netral | Negatif
 *   • Sort    : Skor Keyakinan ↓↑ | Tanggal ↓↑ | Reaksi ↓
 *   • Search  : Filter teks komentar
 *   • Pagination: 20 komentar per halaman
 *   • Label badge warna sesuai sentimen
 */

import { useState, useMemo, useCallback } from "react";

export interface CommentItem {
  author_name: string;
  text: string;
  Teks_Bersih?: string;
  timestamp: string;
  reaction_count: string;
  reply_count: string;
  label: "Positif" | "Negatif" | "Netral";
  /** Signed score -1..+1. |score|*100 = confidence % */
  score: number;
}

interface Props {
  comments: CommentItem[];
  model: string;
}

type TabKey = "Semua" | "Positif" | "Netral" | "Negatif";
type SortKey = "score_desc" | "score_asc" | "date_desc" | "date_asc" | "reactions_desc";

const PAGE_SIZE = 20;

const TAB_CONFIG: { key: TabKey; label: string; color: string; bg: string; border: string }[] = [
  { key: "Semua",   label: "Semua",   color: "text-slate-200", bg: "bg-slate-600",  border: "border-slate-500" },
  { key: "Positif", label: "Positif", color: "text-green-300",  bg: "bg-green-600",  border: "border-green-500" },
  { key: "Netral",  label: "Netral",  color: "text-yellow-300", bg: "bg-yellow-600", border: "border-yellow-500" },
  { key: "Negatif", label: "Negatif", color: "text-red-300",    bg: "bg-red-600",    border: "border-red-500" },
];

const BADGE: Record<string, string> = {
  Positif: "bg-green-500/20  text-green-300  border-green-500/30",
  Netral:  "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Negatif: "bg-red-500/20    text-red-300    border-red-500/30",
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "score_desc",     label: "Skor Keyakinan ↓ (tertinggi)" },
  { value: "score_asc",      label: "Skor Keyakinan ↑ (terendah)" },
  { value: "date_desc",      label: "Tanggal ↓ (terbaru)" },
  { value: "date_asc",       label: "Tanggal ↑ (terlama)" },
  { value: "reactions_desc", label: "Reaksi ↓ (terbanyak)" },
];

function formatDate(ts: string): string {
  if (!ts) return "–";
  try {
    return new Date(ts).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return ts; }
}

function confidencePct(score: number): number {
  return Math.round(Math.abs(score) * 100);
}

function confidenceColor(pct: number): string {
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 70) return "text-yellow-400";
  return "text-orange-400";
}

export default function CommentList({ comments, model }: Props) {
  const [activeTab, setActiveTab]   = useState<TabKey>("Semua");
  const [sortKey, setSortKey]       = useState<SortKey>("score_desc");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [showClean, setShowClean]   = useState(false);

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...comments];

    // Filter by tab
    if (activeTab !== "Semua") {
      result = result.filter((c) => c.label === activeTab);
    }

    // Filter by search
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (c) =>
          (c.text ?? "").toLowerCase().includes(q) ||
          (c.author_name ?? "").toLowerCase().includes(q) ||
          (c.Teks_Bersih ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [comments, activeTab, search]);

  // ── Sort ────────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "score_desc":
        return arr.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
      case "score_asc":
        return arr.sort((a, b) => Math.abs(a.score) - Math.abs(b.score));
      case "date_desc":
        return arr.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      case "date_asc":
        return arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      case "reactions_desc":
        return arr.sort(
          (a, b) => parseInt(b.reaction_count || "0") - parseInt(a.reaction_count || "0")
        );
      default:
        return arr;
    }
  }, [filtered, sortKey]);

  // ── Pagination ───────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  // Count per tab
  const counts = useMemo(() => ({
    Semua:   comments.length,
    Positif: comments.filter((c) => c.label === "Positif").length,
    Netral:  comments.filter((c) => c.label === "Netral").length,
    Negatif: comments.filter((c) => c.label === "Negatif").length,
  }), [comments]);

  return (
    <div className="glass-card p-5 animate-slide-up">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Daftar Komentar
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {sorted.length.toLocaleString("id-ID")} komentar ditampilkan
            {search && <span> · pencarian: "<span className="text-blue-400">{search}</span>"</span>}
          </p>
        </div>

        {/* Toggle teks bersih */}
        {model === "indobertweet" && (
          <button
            onClick={() => setShowClean((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              showClean
                ? "bg-blue-600/30 border-blue-500 text-blue-300"
                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
            }`}
          >
            {showClean ? "▶ Tampilkan Teks Asli" : "▶ Tampilkan Teks Bersih (nusantara-nlp)"}
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.key}
            id={`tab-${tab.key.toLowerCase()}`}
            onClick={() => handleTabChange(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              activeTab === tab.key
                ? `${tab.bg} ${tab.border} ${tab.color} shadow-md`
                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === tab.key ? "bg-white/20 text-white" : "bg-white/10 text-slate-500"
            }`}>
              {counts[tab.key].toLocaleString("id-ID")}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search + Sort ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="comment-search"
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari komentar atau nama penulis…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                       text-slate-200 placeholder-slate-500 text-sm focus:outline-none
                       focus:border-blue-500 focus:bg-white/10 transition-all"
          />
          {search && (
            <button onClick={() => handleSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              ✕
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            id="comment-sort"
            value={sortKey}
            onChange={(e) => { setSortKey(e.target.value as SortKey); setPage(1); }}
            className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10
                       text-slate-300 text-sm focus:outline-none focus:border-blue-500
                       focus:bg-white/10 transition-all cursor-pointer min-w-[220px]"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-800 text-slate-200">
                {opt.label}
              </option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* ── Comment Cards ───────────────────────────────────────────────────── */}
      {paginated.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">Tidak ada komentar ditemukan</p>
          {search && (
            <p className="text-xs mt-1">
              Coba hapus filter pencarian atau ganti tab
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((c, idx) => {
            const confPct  = confidencePct(c.score);
            const confCol  = confidenceColor(confPct);
            const reactions = parseInt(c.reaction_count || "0");
            const replies   = parseInt(c.reply_count   || "0");
            const displayText = showClean && c.Teks_Bersih ? c.Teks_Bersih : c.text;

            return (
              <div
                key={idx}
                className="group relative p-4 rounded-xl border border-white/5 bg-white/[0.03]
                           hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200"
              >
                {/* Sentiment stripe on left */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                  c.label === "Positif" ? "bg-green-500"
                  : c.label === "Negatif" ? "bg-red-500"
                  : "bg-yellow-500"
                }`} />

                <div className="pl-3">
                  {/* Top row */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {/* Author */}
                    <span className="text-sm font-semibold text-slate-200 truncate max-w-[180px]">
                      {c.author_name || "Anonim"}
                    </span>

                    {/* Sentiment badge */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${BADGE[c.label]}`}>
                      {c.label}
                    </span>

                    {/* Confidence */}
                    <span className={`text-xs font-bold ${confCol}`} title="Skor keyakinan model">
                      {confPct}%
                    </span>

                    {/* Confidence bar */}
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden min-w-[60px] max-w-[100px]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          c.label === "Positif" ? "bg-green-500"
                          : c.label === "Negatif" ? "bg-red-500"
                          : "bg-yellow-500"
                        }`}
                        style={{ width: `${confPct}%` }}
                      />
                    </div>

                    {/* Spacer */}
                    <span className="flex-1" />

                    {/* Timestamp */}
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(c.timestamp)}
                    </span>
                  </div>

                  {/* Comment text */}
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {displayText || "–"}
                  </p>

                  {/* Bottom: reactions & replies */}
                  {(reactions > 0 || replies > 0) && (
                    <div className="flex gap-3 mt-2">
                      {reactions > 0 && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          👍 {reactions.toLocaleString("id-ID")}
                        </span>
                      )}
                      {replies > 0 && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          💬 {replies.toLocaleString("id-ID")} balasan
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <p className="text-xs text-slate-500">
            Halaman {page} dari {totalPages}
            {" · "}
            {sorted.length.toLocaleString("id-ID")} hasil
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-slate-400
                         disabled:opacity-30 hover:bg-white/10 transition-all"
              title="Halaman pertama"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-slate-300
                         disabled:opacity-30 hover:bg-white/10 transition-all"
            >
              ← Prev
            </button>

            {/* Page number pills */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <button
                  key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm transition-all ${
                    page === p
                      ? "bg-blue-600 text-white border border-blue-500 font-bold"
                      : "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-slate-300
                         disabled:opacity-30 hover:bg-white/10 transition-all"
            >
              Next →
            </button>
            <button
              onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-2 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-slate-400
                         disabled:opacity-30 hover:bg-white/10 transition-all"
              title="Halaman terakhir"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
