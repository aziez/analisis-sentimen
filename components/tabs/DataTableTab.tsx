"use client";

import { useState, useMemo } from "react";
import type { SentimentResult } from "@/lib/sentimentEngine";

interface Props {
  comments: SentimentResult[];
  model: string;
}

const PAGE_SIZE = 50;

type SortKey = "score" | "date" | "reactions" | "none";

export default function DataTableTab({ comments, model }: Props) {
  const [search,      setSearch]      = useState("");
  const [filterLabel, setFilterLabel] = useState<"all" | "Positif" | "Netral" | "Negatif">("all");
  const [sortKey,     setSortKey]     = useState<SortKey>("none");
  const [sortDesc,    setSortDesc]    = useState(true);
  const [page,        setPage]        = useState(1);

  const filtered = useMemo(() => {
    let rows = comments;
    if (filterLabel !== "all") rows = rows.filter((r) => r.label === filterLabel);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        (r.text ?? "").toLowerCase().includes(q) ||
        (r.author_name ?? "").toLowerCase().includes(q) ||
        (r.Teks_Bersih ?? "").toLowerCase().includes(q)
      );
    }
    if (sortKey === "score")     rows = [...rows].sort((a, b) => sortDesc ? Math.abs(b.score) - Math.abs(a.score) : Math.abs(a.score) - Math.abs(b.score));
    if (sortKey === "reactions") rows = [...rows].sort((a, b) => sortDesc ? (parseFloat(b.reaction_count ?? "0") - parseFloat(a.reaction_count ?? "0")) : (parseFloat(a.reaction_count ?? "0") - parseFloat(b.reaction_count ?? "0")));
    if (sortKey === "date")      rows = [...rows].sort((a, b) => sortDesc ? b.timestamp.localeCompare(a.timestamp) : a.timestamp.localeCompare(b.timestamp));
    return rows;
  }, [comments, search, filterLabel, sortKey, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else { setSortKey(key); setSortDesc(true); }
    setPage(1);
  }

  function exportCSV() {
    const header = "No,Author,Text,Date,Sentiment,Score,Reactions,Replies,Teks_Bersih";
    const rows = filtered.map((r, i) =>
      [
        i + 1,
        `"${(r.author_name ?? "").replace(/"/g, '""')}"`,
        `"${(r.text ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
        r.timestamp,
        r.label,
        r.score,
        r.reaction_count ?? "0",
        r.reply_count    ?? "0",
        `"${(r.Teks_Bersih ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      ].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href = url; a.download = `sentiment_${model}_table.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const BADGE: Record<string, string> = {
    Positif: "badge-positive",
    Netral:  "badge-neutral",
    Negatif: "badge-negative",
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in">

      {/* ── Controls ─────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          className="input flex-1 min-w-48"
          placeholder="Cari teks, penulis…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {(["all","Positif","Netral","Negatif"] as const).map((lbl) => (
            <button key={lbl} onClick={() => { setFilterLabel(lbl); setPage(1); }}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={
                filterLabel === lbl
                  ? { background: "var(--clr-primary)", color: "#fff" }
                  : { color: "var(--text-secondary)" }
              }
            >
              {lbl === "all" ? "Semua" : lbl}
            </button>
          ))}
        </div>
        <button onClick={exportCSV} className="btn-ghost text-xs">
          ⬇ Export CSV
        </button>
      </div>

      {/* ── Stats row ─────────────────────────────── */}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Menampilkan <strong style={{ color: "var(--text-secondary)" }}>{filtered.length.toLocaleString("id-ID")}</strong> dari{" "}
        <strong style={{ color: "var(--text-secondary)" }}>{comments.length.toLocaleString("id-ID")}</strong> komentar
      </p>

      {/* ── Table ─────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold w-10" style={{ color: "var(--text-muted)" }}>#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Penulis</th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Teks</th>
                <th className="px-4 py-3 text-left text-xs font-semibold cursor-pointer hover:opacity-80"
                    style={{ color: "var(--text-muted)" }} onClick={() => toggleSort("date")}>
                  Tanggal {sortKey === "date" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Sentimen</th>
                <th className="px-4 py-3 text-right text-xs font-semibold cursor-pointer hover:opacity-80"
                    style={{ color: "var(--text-muted)" }} onClick={() => toggleSort("score")}>
                  Score {sortKey === "score" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold cursor-pointer hover:opacity-80"
                    style={{ color: "var(--text-muted)" }} onClick={() => toggleSort("reactions")}>
                  Reaksi {sortKey === "reactions" ? (sortDesc ? "↓" : "↑") : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => {
                const idx = (page - 1) * PAGE_SIZE + i + 1;
                const scoreColor = r.score > 0.05 ? "var(--clr-positive)" : r.score < -0.05 ? "var(--clr-negative)" : "var(--clr-neutral)";
                return (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{idx}</td>
                    <td className="px-4 py-3 text-xs font-medium max-w-28 truncate" style={{ color: "var(--text-secondary)" }}
                        title={r.author_name}>{r.author_name || "—"}</td>
                    <td className="px-4 py-3 text-xs max-w-xs" style={{ color: "var(--text-primary)" }}>
                      <span className="line-clamp-2">{r.text}</span>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      {r.timestamp ? new Date(r.timestamp).toLocaleDateString("id-ID") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${BADGE[r.label] ?? ""}`}>{r.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-right font-mono font-bold" style={{ color: scoreColor }}>
                      {r.score > 0 ? "+" : ""}{r.score.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-xs text-right" style={{ color: "var(--text-secondary)" }}>
                      {parseInt(r.reaction_count ?? "0").toLocaleString("id-ID")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="btn-ghost px-2 py-1 text-xs disabled:opacity-40">«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-2 py-1 text-xs disabled:opacity-40">‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className="px-3 py-1 rounded-lg text-xs font-medium"
                  style={p === page ? { background: "var(--clr-primary)", color: "#fff" } : { color: "var(--text-secondary)" }}
                >{p}</button>
              );
            })}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost px-2 py-1 text-xs disabled:opacity-40">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="btn-ghost px-2 py-1 text-xs disabled:opacity-40">»</button>
          </div>
        </div>
      )}
    </div>
  );
}
