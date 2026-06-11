"use client";

import { useRef, useState } from "react";

interface Props {
  onFileSelected: (file: File) => void;
  uploading: boolean;
}

export default function UploadZone({ onFileSelected, uploading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Hanya file CSV yang didukung.");
      return;
    }
    onFileSelected(file);
  }

  return (
    <div
      className={`drop-zone p-10 text-center ${dragging ? "drag-over" : ""}`}
      style={{ minHeight: 220 }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {uploading ? (
        <>
          <div className="spinner w-10 h-10 mx-auto mb-4" />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Mengunggah dan mem-parsing CSV…</p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl"
               style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            📂
          </div>
          <p className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Drag & drop file CSV di sini
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            atau klik untuk memilih file
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Mendukung semua format CSV · Maksimum 15 MB · Header row diperlukan
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {["Facebook Comments", "Twitter/X", "YouTube", "Ulasan Produk", "Transkrip / Teks Bebas"].map((label) => (
              <span key={label} className="badge" style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                {label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
