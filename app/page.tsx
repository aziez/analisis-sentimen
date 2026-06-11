"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";

import Link from "next/link";
import Sidebar, { type ModelId } from "@/components/layout/Sidebar";
import TabBar, { type TabId }   from "@/components/layout/TabBar";
import UploadZone               from "@/components/upload/UploadZone";
import ColumnMapper             from "@/components/upload/ColumnMapper";

import type { SentimentResult, Aggregates } from "@/lib/sentimentEngine";
import type { ColumnMapping }               from "@/lib/uploadStore";

const OverviewTab   = dynamic(() => import("@/components/tabs/OverviewTab"),   { ssr: false });
const TextMiningTab = dynamic(() => import("@/components/tabs/TextMiningTab"), { ssr: false });
const TemporalTab   = dynamic(() => import("@/components/tabs/TemporalTab"),   { ssr: false });
const AuthorTab     = dynamic(() => import("@/components/tabs/AuthorTab"),     { ssr: false });
const CompareTab    = dynamic(() => import("@/components/tabs/CompareTab"),    { ssr: false });
const DataTableTab  = dynamic(() => import("@/components/tabs/DataTableTab"),  { ssr: false });
const EmotionTab    = dynamic(() => import("@/components/tabs/EmotionTab"),    { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  model: string;
  modelDescription: string;
  aggregates: Aggregates;
  totalComments: number;
  comments: SentimentResult[];
}

interface UploadPreview {
  id: string;
  name: string;
  columns: string[];
  rowCount: number;
  preview: Record<string, string>[];
}

type AppMode = "default" | "uploaded";
type UploadStep = "closed" | "zone" | "mapping";

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [theme,        setTheme]        = useState<"dark" | "light">("dark");
  const [activeTab,    setActiveTab]    = useState<TabId>("overview");
  const [model,        setModel]        = useState<ModelId>("indobertweet");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [result,       setResult]       = useState<AnalysisResult | null>(null);

  const [mode,         setMode]         = useState<AppMode>("default");
  const [uploadStep,   setUploadStep]   = useState<UploadStep>("closed");
  const [uploading,    setUploading]    = useState(false);
  const [uploadPrev,   setUploadPrev]   = useState<UploadPreview | null>(null);
  const [datasetId,    setDatasetId]    = useState<string | null>(null);
  const [datasetName,  setDatasetName]  = useState("fb_comments.csv");
  const [activeMapping, setActiveMapping] = useState<ColumnMapping | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);

  // ── Theme ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem("sentiscope-theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("sentiscope-theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }

  // ── Load default dataset ─────────────────────────────────────────────────

  const loadDefault = useCallback(async (m: ModelId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sentiment?model=${m}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      setResult(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "default") loadDefault(model);
  }, [model, mode, loadDefault]);

  // ── Model change ──────────────────────────────────────────────────────────

  function handleModelChange(m: ModelId) {
    setModel(m);
    if (mode === "uploaded" && datasetId && activeMapping) {
      loadUploaded(datasetId, m, activeMapping);
    }
    // default mode is handled by the useEffect above
  }

  // ── Upload flow ───────────────────────────────────────────────────────────

  async function handleFileSelected(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload gagal");
      setUploadPrev(json);
      setUploadStep("mapping");
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  async function handleAnalyze(mapping: ColumnMapping, selectedModel: string) {
    if (!uploadPrev) return;
    setUploadStep("closed");
    setLoading(true);
    setError(null);
    setMode("uploaded");
    setDatasetId(uploadPrev.id);
    setDatasetName(uploadPrev.name);
    setModel(selectedModel as ModelId);
    setActiveMapping(mapping);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: uploadPrev.id, mapping, model: selectedModel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analisis gagal");
      setResult(json);
      setActiveTab("overview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analisis gagal");
    } finally {
      setLoading(false);
    }
  }

  function loadUploaded(id: string, m: ModelId, mapping: ColumnMapping) {
    // Re-run analysis when model changes on uploaded dataset
    // mapping is already stored server-side, just pass text as placeholder
    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasetId: id, mapping, model: m }),
    })
      .then((r) => r.json())
      .then((json) => setResult(json))
      .catch(() => {});
  }

  function exportCSV() {
    if (!result) return;
    const header = "No,Author,Text,Teks_Bersih,Date,Sentiment,Score,Reactions,Replies";
    const rows = result.comments.map((r, i) =>
      [
        i + 1,
        `"${(r.author_name ?? "").replace(/"/g, '""')}"`,
        `"${(r.text ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
        `"${(r.Teks_Bersih ?? "").replace(/"/g, '""')}"`,
        r.timestamp,
        r.label,
        r.score,
        r.reaction_count ?? "0",
        r.reply_count ?? "0",
      ].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `sentiscope_${model}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPNG() {
    if (!mainRef.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(mainRef.current, {
      backgroundColor: theme === "dark" ? "#0c1118" : "#f0f4f8",
    });
    const a = document.createElement("a");
    a.download = `sentiscope_${model}.png`;
    a.href = canvas.toDataURL();
    a.click();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-app)" }}>

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <div className="relative">
        <Sidebar
          model={model}
          onModelChange={handleModelChange}
          theme={theme}
          onThemeToggle={toggleTheme}
          onUpload={() => setUploadStep("zone")}
          datasetName={datasetName}
          totalRows={result?.totalComments ?? 0}
          isDefault={mode === "default"}
          loading={loading}
        />
      </div>

      {/* ── Main Area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top header ─────────────────────────────────────── */}
        <header className="flex items-center justify-between px-6 py-3 shrink-0"
                style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", height: 56 }}>
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h1 className="text-sm font-bold leading-none" style={{ color: "var(--text-primary)" }}>
                SentiScope
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Analisis Sentimen Teks Indonesia · UNPAM Data Mining
              </p>
            </div>
            {result && (
              <span className="hidden sm:flex badge ml-3"
                    style={{ background: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                📄 {datasetName} · {result.totalComments.toLocaleString("id-ID")} baris
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/analisis-teks" className="btn-ghost text-xs py-1.5 px-3 hidden sm:flex">
              ✍ Analisis Teks
            </Link>
            <Link href="/penjelasan" className="btn-ghost text-xs py-1.5 px-3 hidden sm:flex">
              📖 Cara Kerja
            </Link>
            {result && (
              <>
                <button onClick={exportCSV} className="btn-ghost text-xs py-1.5 px-3 hidden sm:flex">
                  ⬇ CSV
                </button>
                <button onClick={exportPNG} className="btn-ghost text-xs py-1.5 px-3 hidden sm:flex">
                  📸 PNG
                </button>
              </>
            )}
            <button onClick={() => setUploadStep("zone")} className="btn-primary py-1.5 px-3 text-xs">
              + Upload CSV
            </button>
          </div>
        </header>

        {/* ── Tab bar ────────────────────────────────────────── */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* ── Content ────────────────────────────────────────── */}
        <main ref={mainRef} className="flex-1 overflow-auto" style={{ background: "var(--bg-app)" }}>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-5 animate-fade-in">
              <div className="spinner w-12 h-12" />
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Menganalisis dengan {model}…
                </p>
                {model === "mbert_js" && (
                  <p className="text-xs mt-2 max-w-sm" style={{ color: "var(--text-muted)" }}>
                    mBERT JS membutuhkan 5–15 menit untuk pertama kali (download model + inference).
                    Permintaan selanjutnya akan instan karena menggunakan cache.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 animate-fade-in">
              <div className="card p-6 max-w-md text-center" style={{ borderColor: "var(--clr-negative-border)", background: "var(--clr-negative-bg)" }}>
                <p className="text-lg font-bold mb-2" style={{ color: "var(--clr-negative)" }}>⚠ Terjadi Error</p>
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{error}</p>
                {model === "indobertweet" && mode === "default" && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Pastikan <code>hasil_sentimen_fb.csv</code> ada di{" "}
                    <code>dashboard/public/data/</code>.
                    Jalankan <code>py sentimen_analisis.py</code> terlebih dahulu.
                  </p>
                )}
                <button onClick={() => { setError(null); loadDefault(model); }} className="btn-primary mt-4">
                  Coba Lagi
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && !result && (
            <div className="flex flex-col items-center justify-center h-full gap-5 animate-fade-in">
              <span className="text-6xl">📊</span>
              <p className="text-base font-semibold" style={{ color: "var(--text-secondary)" }}>
                Belum ada data untuk ditampilkan
              </p>
              <button onClick={() => setUploadStep("zone")} className="btn-primary">
                + Upload CSV untuk Mulai
              </button>
            </div>
          )}

          {/* Dashboard tabs */}
          {!loading && !error && result && (
            <>
              {activeTab === "overview" && (
                <OverviewTab
                  aggregates={result.aggregates}
                  comments={result.comments}
                  model={result.model}
                  modelDescription={result.modelDescription}
                  theme={theme}
                />
              )}
              {activeTab === "text-mining" && (
                <TextMiningTab comments={result.comments} />
              )}
              {activeTab === "temporal" && (
                <TemporalTab aggregates={result.aggregates} comments={result.comments} theme={theme} />
              )}
              {activeTab === "authors" && (
                <AuthorTab comments={result.comments} />
              )}
              {activeTab === "compare" && (
                <CompareTab defaultDataset={mode === "default"} datasetId={datasetId ?? undefined} />
              )}
              {activeTab === "table" && (
                <DataTableTab comments={result.comments} model={result.model} />
              )}
              {activeTab === "emotions" && (
                <EmotionTab comments={result.comments} />
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Upload Modal ──────────────────────────────────────── */}
      {uploadStep !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setUploadStep("closed"); }}
        >
          <div
            className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
            style={{ background: "var(--bg-surface)" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4"
                 style={{ borderBottom: "1px solid var(--border)" }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  {uploadStep === "zone" ? "Upload Dataset CSV" : "Konfigurasi Kolom & Model"}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {uploadStep === "zone"
                    ? "Upload file CSV apapun — komentar, ulasan, teks pidato, dll."
                    : "Petakan kolom CSV ke field analisis yang dibutuhkan"}
                </p>
              </div>
              <button onClick={() => setUploadStep("closed")}
                className="p-1.5 rounded-lg transition-all hover:opacity-70"
                style={{ color: "var(--text-secondary)" }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6">
              {uploadStep === "zone" && (
                <UploadZone onFileSelected={handleFileSelected} uploading={uploading} />
              )}
              {uploadStep === "mapping" && uploadPrev && (
                <ColumnMapper
                  uploadPreview={uploadPrev}
                  onAnalyze={handleAnalyze}
                  onCancel={() => setUploadStep("zone")}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
