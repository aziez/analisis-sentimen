"use client";

export type TabId =
  | "overview"
  | "text-mining"
  | "temporal"
  | "authors"
  | "compare"
  | "table"
  | "emotions";

export const TABS: { id: TabId; label: string; icon: string; desc: string }[] = [
  { id: "overview",    label: "Overview",     icon: "📊", desc: "Distribusi & ringkasan" },
  { id: "text-mining", label: "Text Mining",  icon: "🔍", desc: "Word cloud, n-gram, TF-IDF" },
  { id: "temporal",    label: "Temporal",     icon: "📅", desc: "Tren waktu & heatmap" },
  { id: "authors",     label: "Authors",      icon: "👥", desc: "Analisis per penulis" },
  { id: "compare",     label: "Compare",      icon: "⚖️",  desc: "Perbandingan model" },
  { id: "table",       label: "Data Table",   icon: "📋", desc: "Tabel data lengkap" },
  { id: "emotions",    label: "Emotions",     icon: "🎭", desc: "Analisis emosi 8-dimensi" },
];

interface Props {
  active: TabId;
  onChange: (t: TabId) => void;
}

export default function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="flex items-center gap-1 px-4 overflow-x-auto shrink-0"
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
        height: 48,
        scrollbarWidth: "none",
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`tab-item ${active === tab.id ? "active" : ""}`}
          title={tab.desc}
        >
          <span className="text-sm leading-none">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
