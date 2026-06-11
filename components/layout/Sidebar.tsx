"use client";

import { useState } from "react";

export type ModelId = "indobertweet" | "mbert_js" | "indonesia_lexicon" | "rule_based_id";

interface Props {
  model: ModelId;
  onModelChange: (m: ModelId) => void;
  theme: "dark" | "light";
  onThemeToggle: () => void;
  onUpload: () => void;
  datasetName: string;
  totalRows: number;
  isDefault: boolean;
  loading: boolean;
}

const MODELS: { id: ModelId; label: string; icon: string; desc: string; badge: string }[] = [
  {
    id: "indobertweet",
    label: "IndoBERTweet",
    icon: "🏆",
    desc: "Deep Learning — Akurasi tinggi",
    badge: "Python CSV",
  },
  {
    id: "mbert_js",
    label: "mBERT JS",
    icon: "🔬",
    desc: "Transformer multilingual",
    badge: "5-15 menit",
  },
  {
    id: "indonesia_lexicon",
    label: "InSet Lexicon",
    icon: "📖",
    desc: "Kamus Bahasa Indonesia",
    badge: "Cepat",
  },
  {
    id: "rule_based_id",
    label: "Rule-Based ID",
    icon: "⚙️",
    desc: "InSet + negasi + intensifier",
    badge: "Cepat",
  },
];

export default function Sidebar({
  model, onModelChange, theme, onThemeToggle, onUpload,
  datasetName, totalRows, isDefault, loading,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className="flex flex-col h-full shrink-0 transition-all duration-200"
      style={{
        width: collapsed ? 56 : 228,
        background: "var(--bg-sidebar)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                 style={{ background: "var(--clr-primary)", color: "#fff" }}>S</div>
            <span className="text-sm font-bold text-white truncate">SentiScope</span>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold mx-auto"
               style={{ background: "var(--clr-primary)", color: "#fff" }}>S</div>
        )}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="p-1 rounded-md opacity-50 hover:opacity-100 transition-opacity" style={{ color: "#fff" }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="absolute -right-3 top-14 w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-10"
                  style={{ background: "var(--bg-sidebar)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">

        {/* ── Dataset ─────────────────────────────────── */}
        {!collapsed && (
          <div>
            <p className="section-title px-2 mb-2">Dataset</p>
            <div className="px-2 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">📄</span>
                <span className="text-xs font-semibold text-white truncate">{datasetName}</span>
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                {totalRows.toLocaleString("id-ID")} baris
                {isDefault && <span className="ml-1 text-blue-400">(default)</span>}
              </p>
            </div>
            <button
              onClick={onUpload}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload CSV Baru
            </button>
          </div>
        )}

        {/* ── Model Selector ───────────────────────────── */}
        <div>
          {!collapsed && <p className="section-title px-2 mb-2">Model Sentimen</p>}
          <div className="space-y-1">
            {MODELS.map((m) => {
              const active = model === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => !loading && onModelChange(m.id)}
                  disabled={loading}
                  title={collapsed ? m.label : undefined}
                  className={`w-full text-left rounded-lg transition-all duration-150 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  style={
                    active
                      ? { background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", padding: collapsed ? "8px" : "10px 10px" }
                      : { background: "transparent", border: "1px solid transparent", padding: collapsed ? "8px" : "10px 10px" }
                  }
                >
                  {collapsed ? (
                    <span className={`text-base flex justify-center ${active ? "opacity-100" : "opacity-50"}`}>{m.icon}</span>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{m.icon}</span>
                        <span className="text-xs font-semibold truncate" style={{ color: active ? "#93c5fd" : "rgba(255,255,255,0.75)" }}>
                          {m.label}
                        </span>
                        <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", fontSize: "0.6rem" }}>
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 ml-6 truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {m.desc}
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Upload button (collapsed) ───────────────── */}
        {collapsed && (
          <button onClick={onUpload} title="Upload CSV" className="w-full flex justify-center p-2 rounded-lg transition-all"
                  style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd" }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────── */}
      <div className="px-2 pb-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          onClick={onThemeToggle}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
          style={{ color: "rgba(255,255,255,0.55)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {theme === "dark" ? (
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5"/><path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
          {!collapsed && (
            <span className="text-xs font-medium">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
