"use client";

import { useState } from "react";
import type { ColumnMapping } from "@/lib/uploadStore";

interface UploadPreview {
  id: string;
  name: string;
  columns: string[];
  rowCount: number;
  preview: Record<string, string>[];
}

interface Props {
  uploadPreview: UploadPreview;
  onAnalyze: (mapping: ColumnMapping, model: string) => void;
  onCancel: () => void;
}

type PresetKey = "facebook" | "twitter" | "youtube" | "review" | "generic";

const PRESETS: Record<PresetKey, { label: string; icon: string; mapping: Partial<ColumnMapping> }> = {
  facebook: {
    label: "Facebook Comments", icon: "📘",
    mapping: { text: "text", author: "author_name", timestamp: "timestamp", reactions: "reaction_count", replies: "reply_count" },
  },
  twitter: {
    label: "Twitter/X", icon: "🐦",
    mapping: { text: "text", author: "username", timestamp: "created_at", reactions: "like_count", replies: "reply_count" },
  },
  youtube: {
    label: "YouTube Comments", icon: "▶️",
    mapping: { text: "comment_text", author: "author", timestamp: "published_at", reactions: "like_count", replies: "reply_count" },
  },
  review: {
    label: "Ulasan Produk", icon: "⭐",
    mapping: { text: "review_text", author: "reviewer", timestamp: "date" },
  },
  generic: {
    label: "Teks Bebas", icon: "📝",
    mapping: {},
  },
};

const MODEL_OPTIONS = [
  { value: "rule_based_id",     label: "Rule-Based ID (Cepat, Bahasa Indonesia)" },
  { value: "indonesia_lexicon", label: "InSet Lexicon (Cepat, Bahasa Indonesia)" },
  { value: "mbert_js",          label: "mBERT JS (Lambat, Multilingual)" },
  { value: "indobertweet",      label: "IndoBERTweet (Butuh kolom hasil Python)" },
];

export default function ColumnMapper({ uploadPreview, onAnalyze, onCancel }: Props) {
  const { columns, preview, name, rowCount } = uploadPreview;

  const [mapping, setMapping] = useState<ColumnMapping>({ text: columns[0] ?? "" });
  const [model, setModel] = useState("rule_based_id");
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

  function applyPreset(key: PresetKey) {
    const preset = PRESETS[key];
    const pm = preset.mapping;
    const resolved: ColumnMapping = { text: "" };

    for (const [field, hint] of Object.entries(pm)) {
      const match = columns.find((c) =>
        c.toLowerCase() === (hint as string).toLowerCase() ||
        c.toLowerCase().includes((hint as string).toLowerCase())
      );
      if (match) (resolved as unknown as Record<string, string>)[field] = match;
    }

    if (!resolved.text && columns[0]) resolved.text = columns[0];
    setMapping(resolved);
    setActivePreset(key);
  }

  function set(field: keyof ColumnMapping, value: string) {
    setMapping((m) => ({ ...m, [field]: value || undefined }));
    setActivePreset(null);
  }

  const canAnalyze = !!mapping.text;

  return (
    <div className="space-y-5">
      {/* File info */}
      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <span className="text-2xl">📄</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{name}</p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {rowCount.toLocaleString("id-ID")} baris · {columns.length} kolom
          </p>
        </div>
      </div>

      {/* Presets */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          Preset Format
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(PRESETS) as [PresetKey, (typeof PRESETS)[PresetKey]][]).map(([key, p]) => (
            <button key={key} onClick={() => applyPreset(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                activePreset === key
                  ? { background: "var(--clr-primary-bg)", color: "var(--clr-primary)", border: "1px solid var(--clr-primary)" }
                  : { background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
              }
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Column mapping */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
          Pemetaan Kolom
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([
            { field: "text",         label: "Teks (wajib)",        required: true },
            { field: "author",       label: "Penulis / Sumber",    required: false },
            { field: "timestamp",    label: "Tanggal / Waktu",     required: false },
            { field: "reactions",    label: "Jumlah Reaksi/Like",  required: false },
            { field: "replies",      label: "Jumlah Balasan",      required: false },
            { field: "precomputed",  label: "Label IndoBERTweet",  required: false },
            { field: "confidence",   label: "Skor Keyakinan (0-100)", required: false },
          ] as { field: keyof ColumnMapping; label: string; required: boolean }[]).map(({ field, label, required }) => (
            <div key={field}>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                {label} {required && <span style={{ color: "var(--clr-negative)" }}>*</span>}
              </label>
              <select
                value={(mapping as unknown as Record<string, string | undefined>)[field] ?? ""}
                onChange={(e) => set(field, e.target.value)}
                className="select"
              >
                <option value="">— tidak dipetakan —</option>
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Model */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          Model Sentimen
        </p>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="select">
          {MODEL_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {model === "indobertweet" && !mapping.precomputed && (
          <p className="text-xs mt-1.5" style={{ color: "var(--clr-neutral)" }}>
            ⚠ IndoBERTweet butuh kolom "Label IndoBERTweet" yang dipetakan.
          </p>
        )}
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
            Preview Data (5 baris pertama)
          </p>
          <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                  {columns.slice(0, 5).map((c) => (
                    <th key={c} className="px-3 py-2 text-left font-semibold truncate max-w-32"
                        style={{ color: "var(--text-secondary)" }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    {columns.slice(0, 5).map((c) => (
                      <td key={c} className="px-3 py-2 truncate max-w-32"
                          style={{ color: "var(--text-primary)" }} title={row[c]}>
                        {row[c] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button onClick={onCancel} className="btn-ghost flex-1">Batal</button>
        <button
          onClick={() => canAnalyze && onAnalyze(mapping, model)}
          disabled={!canAnalyze}
          className="btn-primary flex-1 justify-center"
          style={!canAnalyze ? { opacity: 0.5, cursor: "not-allowed" } : {}}
        >
          🚀 Mulai Analisis
        </button>
      </div>
    </div>
  );
}
