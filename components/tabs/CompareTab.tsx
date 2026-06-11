"use client";

import { useState, useCallback } from "react";

type Label = "Positif" | "Netral" | "Negatif";

interface ModelResult {
  model: string;
  modelDescription: string;
  distribution: { Positif: number; Netral: number; Negatif: number };
  totalComments: number;
  averageScore: number;
}

interface Props {
  defaultDataset: boolean;
  datasetId?: string;
}

const FAST_MODELS = [
  { id: "indonesia_lexicon", label: "InSet Lexicon",  icon: "📖", color: "#06b6d4" },
  { id: "rule_based_id",     label: "Rule-Based ID",  icon: "⚙️",  color: "#a855f7" },
];

function MiniBar({ distribution, total }: { distribution: ModelResult["distribution"]; total: number }) {
  const p = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : "0");
  return (
    <div className="space-y-2 mt-3">
      {(["Positif","Netral","Negatif"] as Label[]).map((lbl) => {
        const count = distribution[lbl];
        const pct   = parseFloat(p(count));
        const color = lbl === "Positif" ? "#22c55e" : lbl === "Negatif" ? "#ef4444" : "#eab308";
        return (
          <div key={lbl}>
            <div className="flex justify-between text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>
              <span>{lbl}</span>
              <span>{count.toLocaleString()} ({p(count)}%)</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CompareTab({ defaultDataset, datasetId }: Props) {
  const [results, setResults] = useState<Record<string, ModelResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  const runModel = useCallback(async (modelId: string) => {
    setLoading((l) => ({ ...l, [modelId]: true }));
    setErrors((e) => ({ ...e, [modelId]: "" }));
    try {
      const url = `/api/sentiment?model=${modelId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults((r) => ({
        ...r,
        [modelId]: {
          model: modelId,
          modelDescription: data.modelDescription ?? modelId,
          distribution: data.aggregates.distribution,
          totalComments: data.totalComments,
          averageScore: data.aggregates.averageScore,
        },
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      setErrors((e) => ({ ...e, [modelId]: msg }));
    } finally {
      setLoading((l) => ({ ...l, [modelId]: false }));
    }
  }, []);

  const runAll = useCallback(() => {
    FAST_MODELS.forEach((m) => runModel(m.id));
  }, [runModel]);

  const doneModels = FAST_MODELS.map((m) => m.id).filter((id) => results[id]);

  const agreementRate = (() => {
    if (doneModels.length < 2) return null;
    const perModel = doneModels.map((id) => {
      const { distribution: d, totalComments: t } = results[id];
      const dominant = d.Positif >= d.Negatif && d.Positif >= d.Netral
        ? "Positif" : d.Negatif >= d.Positif && d.Negatif >= d.Netral ? "Negatif" : "Netral";
      return dominant;
    });
    const agree = perModel.every((v) => v === perModel[0]);
    return { dominant: perModel[0], allAgree: agree, models: perModel };
  })();

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── Info banner ─────────────────────────────────── */}
      <div className="card p-4" style={{ background: "var(--clr-primary-bg)", borderColor: "rgba(59,130,246,0.25)" }}>
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Perbandingan Multi-Model
        </p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Jalankan beberapa model sentimen secara paralel pada dataset yang sama, lalu bandingkan hasilnya.
          Model cepat (InSet Lexicon & Rule-Based) tidak membutuhkan waktu lama. mBERT JS mungkin memerlukan 5–15 menit pertama kali.
        </p>
      </div>

      {/* ── Run buttons ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <button onClick={runAll} className="btn-primary">
          ⚡ Jalankan Semua Model Cepat
        </button>
        {FAST_MODELS.map((m) => (
          <button key={m.id} onClick={() => runModel(m.id)} className="btn-ghost text-xs"
                  disabled={loading[m.id]}>
            {loading[m.id] ? (
              <span className="spinner w-4 h-4" />
            ) : (
              <>{m.icon} {m.label}</>
            )}
          </button>
        ))}
      </div>

      {/* ── Agreement badge ─────────────────────────────── */}
      {agreementRate && (
        <div className="flex items-center gap-3 p-3 rounded-xl"
             style={{ background: agreementRate.allAgree ? "var(--clr-positive-bg)" : "var(--clr-neutral-bg)",
                      border: `1px solid ${agreementRate.allAgree ? "var(--clr-positive-border)" : "var(--clr-neutral-border)"}` }}>
          <span className="text-2xl">{agreementRate.allAgree ? "✅" : "⚠️"}</span>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {agreementRate.allAgree ? "Semua model setuju" : "Model tidak sepenuhnya setuju"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Dominan: {agreementRate.dominant} · {agreementRate.models.join(" vs ")}
            </p>
          </div>
        </div>
      )}

      {/* ── Model cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FAST_MODELS.map((m) => {
          const result = results[m.id];
          const isLoading = loading[m.id];
          const error = errors[m.id];

          return (
            <div key={m.id} className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{m.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{m.label}</p>
                  {result && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {result.totalComments.toLocaleString("id-ID")} komentar · avg {result.averageScore > 0 ? "+" : ""}{result.averageScore.toFixed(4)}
                    </p>
                  )}
                </div>
                {isLoading && <div className="spinner w-5 h-5" />}
                {!isLoading && !result && !error && (
                  <span className="badge" style={{ background: "var(--bg-input)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    Belum dijalankan
                  </span>
                )}
                {result && !isLoading && (
                  <span className="badge badge-positive">✓</span>
                )}
              </div>

              {error && (
                <p className="text-xs p-2 rounded" style={{ background: "var(--clr-negative-bg)", color: "var(--clr-negative)" }}>
                  ⚠ {error}
                </p>
              )}

              {isLoading && (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <div className="spinner w-6 h-6" />
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Menganalisis…</p>
                </div>
              )}

              {result && !isLoading && (
                <MiniBar distribution={result.distribution} total={result.totalComments} />
              )}

              {!result && !isLoading && !error && (
                <div className="py-6 text-center">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Klik tombol di atas untuk menjalankan model ini</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Side-by-side comparison (when ≥2 done) ─────── */}
      {doneModels.length >= 2 && (
        <div className="card p-5">
          <p className="section-title mb-3">Perbandingan Distribusi</p>
          {(["Positif", "Netral", "Negatif"] as Label[]).map((lbl) => {
            const color = lbl === "Positif" ? "#22c55e" : lbl === "Negatif" ? "#ef4444" : "#eab308";
            return (
              <div key={lbl} className="mb-4">
                <p className="text-xs font-semibold mb-2" style={{ color }}>Sentimen {lbl}</p>
                <div className="space-y-1.5">
                  {doneModels.map((id) => {
                    const r   = results[id];
                    const pct = r.totalComments > 0 ? (r.distribution[lbl] / r.totalComments) * 100 : 0;
                    const mInfo = FAST_MODELS.find((m) => m.id === id)!;
                    return (
                      <div key={id} className="flex items-center gap-3">
                        <span className="text-xs w-28 truncate shrink-0" style={{ color: "var(--text-secondary)" }}>
                          {mInfo.icon} {mInfo.label}
                        </span>
                        <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: "var(--border)" }}>
                          <div className="h-full rounded flex items-center px-1.5 transition-all duration-700"
                               style={{ width: `${pct}%`, background: color, minWidth: 24 }}>
                            <span className="text-white text-xs font-bold">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
