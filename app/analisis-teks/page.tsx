"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";

// ── Preprocessing simulation ──────────────────────────────────────────────────

const SLANG: Record<string, string> = {
  ga:"tidak", gak:"tidak", ngga:"tidak", gk:"tidak", nggak:"tidak",
  enggak:"tidak", duit:"uang", bgt:"banget", sm:"sama",
  udh:"sudah", udah:"sudah", beneran:"benar", bner:"benar",
  kesel:"kesal", apik:"bagus", sih:"", mah:"", nih:"", deh:"", dong:"",
  yg:"yang", tp:"tapi", dr:"dari", krn:"karena", dgn:"dengan",
  jg:"juga", ky:"seperti", kyk:"seperti", kayak:"seperti",
  cuy:"teman", gitu:"begitu", gimana:"bagaimana", wkwk:"", hehe:"", haha:"",
  bro:"", sis:"", pak:"bapak", bu:"ibu", min:"admin",
};

const STOPWORDS = new Set([
  "yang","dan","di","ke","dari","ini","itu","ada","dengan","untuk",
  "pada","atau","juga","mau","bisa","adalah","kita","saya","anda",
  "mereka","kamu","saja","akan","telah","agar","oleh","jika","maka",
  "bila","itu","ini","tersebut","hal","lain","pun","pula","namun","tapi",
  "bisa","oleh","nya","sudah","belum",
]);

const KEEP_WORDS = new Set([
  "tidak","bukan","jangan","tanpa","kurang","sangat","sekali","banget","amat","benar","belum","juga",
]);

const EMOJI_SCORES: Record<string, number> = {
  "😡":-3,"😠":-3,"🤬":-3,"😤":-2,"😢":-2,"😭":-2,"😞":-2,"😔":-2,
  "🤣":-1,"😅":-1,"😂":-1,"🙄":-1,"😑":-1,"🥱":-1,
  "😍":3,"❤️":3,"👍":2,"🙏":2,"😊":2,"🥰":3,"👏":2,"✨":1,"💪":2,"🥳":3,
  "😃":2,"😁":2,"🤩":3,"😎":2,
};

interface PrepResult {
  raw: string;
  emojis: string[];
  emojiScore: number;
  cleaned: string;
  normalized: string;
  noStopword: string;
  stemmed: string;
  tokens: string[];
  removedSlang: [string, string][];
  removedStop: string[];
}

function runPreprocess(raw: string): PrepResult {
  const emojiRe = /\p{Emoji_Presentation}/gu;
  const emojis = raw.match(emojiRe) ?? [];
  const emojiScore = emojis.reduce((s, e) => s + (EMOJI_SCORES[e] ?? 0), 0);

  const cleaned = raw
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/@\w+/g, " ")
    .replace(/#\w+/g, " ")
    .replace(/\p{Emoji_Presentation}/gu, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const removedSlang: [string, string][] = [];
  const normalized = cleaned
    .split(" ")
    .map((w) => {
      if (SLANG[w] !== undefined) {
        if (SLANG[w]) removedSlang.push([w, SLANG[w]]);
        return SLANG[w];
      }
      return w;
    })
    .filter(Boolean)
    .join(" ");

  const removedStop: string[] = [];
  const noStopword = normalized
    .split(" ")
    .filter((w) => {
      if (KEEP_WORDS.has(w)) return true;
      if (STOPWORDS.has(w)) { removedStop.push(w); return false; }
      return true;
    })
    .join(" ");

  const SUFFIXES = ["kan", "an", "i", "nya", "lah", "kah"];
  const PREFIXES = ["mengecewa", "meng", "men", "mem", "me", "ber", "ter", "per", "ke"];
  const stemmed = noStopword
    .split(" ")
    .map((word) => {
      let w = word;
      for (const s of SUFFIXES) if (w.endsWith(s) && w.length > s.length + 2) { w = w.slice(0, -s.length); break; }
      for (const p of PREFIXES) if (w.startsWith(p) && w.length > p.length + 2) { w = w.slice(p.length); break; }
      return w;
    })
    .join(" ");

  const tokens = stemmed.split(" ").filter(Boolean);
  return { raw, emojis, emojiScore, cleaned, normalized, noStopword, stemmed, tokens, removedSlang, removedStop };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EXAMPLES = [
  { icon: "😞", label: "Komentar Negatif",  text: "Pelayanan sangat buruk dan mengecewakan banget! Petugas tidak ramah sama sekali, ga ada penjelasan apapun." },
  { icon: "😊", label: "Komentar Positif",  text: "Alhamdulillah bagus banget pelayanannya, cepat dan ramah. Terima kasih banyak, sangat memuaskan!" },
  { icon: "😐", label: "Teks Informatif",   text: "Jadwal kegiatan dilaksanakan besok pagi di gedung utama lantai dua sesuai dengan agenda yang telah ditetapkan." },
  { icon: "😏", label: "Sarkasme",          text: "Yg pnting Terima gaji.. Jln tdk pnting 😅 pejabatnya santai aja ya, rakyat yg susah" },
  { icon: "😤", label: "Keluhan Informal",  text: "gk mau keluar duit pajak 🤣🤣 beneran udh kesel banget sm pemerintah!! ini gimana sih caranya" },
];

const MODELS = [
  {
    id: "rule_based_id",
    icon: "⚙️",
    name: "Rule-Based ID",
    desc: "InSet + Negasi + Intensifier · Rekomendasi",
    recommended: true,
    waitNote: null,
  },
  {
    id: "indonesia_lexicon",
    icon: "📖",
    name: "InSet Lexicon",
    desc: "Kamus Sentimen Bahasa Indonesia",
    recommended: false,
    waitNote: null,
  },
  {
    id: "mbert_js",
    icon: "🔬",
    name: "mBERT JS",
    desc: "BERT Multilingual ONNX — akurasi lebih tinggi",
    recommended: false,
    waitNote: "⏳ Pertama kali ~5-15 menit (download model 170MB)",
  },
];

const PREP_STEPS = [
  { id: 0, icon: "😀", label: "Ekstraksi Emoji", color: "#fbbf24",
    desc: "Deteksi emoji dan konversi ke skor sentimen sebelum dibersihkan." },
  { id: 1, icon: "🧹", label: "Pembersihan Teks", color: "#60a5fa",
    desc: "Hapus URL, mention, hashtag, simbol, angka. Ubah ke huruf kecil." },
  { id: 2, icon: "🔄", label: "Normalisasi Slang", color: "#f472b6",
    desc: "Konversi kata gaul dan singkatan ke bentuk baku Indonesia." },
  { id: 3, icon: "✂️", label: "Hapus Stopword", color: "#a78bfa",
    desc: "Buang kata penghubung tak bermakna. JAGA kata negasi & intensifier." },
  { id: 4, icon: "🌱", label: "Stemming", color: "#34d399",
    desc: "Ubah ke kata dasar. 'mengecewakan'→'kecewa'. Meningkatkan match kamus." },
  { id: 5, icon: "🔢", label: "Tokenisasi Akhir", color: "#fb923c",
    desc: "Pecah teks bersih menjadi array token siap untuk analisis model." },
];

interface AnalysisResult {
  label: "Positif" | "Netral" | "Negatif";
  score: number;
  cleanText: string;
  tokens: string[];
  model: string;
  modelDescription: string;
}

interface HistoryItem extends AnalysisResult {
  inputText: string;
  timestamp: Date;
}

function delay(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

// ── Main Component ────────────────────────────────────────────────────────────

export default function AnalisisTeksPage() {
  const [inputText,  setInputText]  = useState("");
  const [model,      setModel]      = useState("rule_based_id");
  const [phase,      setPhase]      = useState<"idle"|"preprocessing"|"analyzing"|"done">("idle");
  const [prepStep,   setPrepStep]   = useState(-1);
  const [result,     setResult]     = useState<AnalysisResult | null>(null);
  const [errMsg,     setErrMsg]     = useState<string | null>(null);
  const [history,    setHistory]    = useState<HistoryItem[]>([]);
  const [charCount,  setCharCount]  = useState(0);

  const resultRef = useRef<HTMLDivElement>(null);
  const prep = inputText.trim() ? runPreprocess(inputText) : null;

  const handleTextChange = useCallback((v: string) => {
    setInputText(v);
    setCharCount(v.length);
    if (phase === "done") { setPhase("idle"); setResult(null); setErrMsg(null); }
  }, [phase]);

  const handleAnalyze = useCallback(async () => {
    if (!inputText.trim()) return;
    setPhase("preprocessing");
    setErrMsg(null);
    setResult(null);
    setPrepStep(-1);

    for (let i = 0; i < PREP_STEPS.length; i++) {
      await delay(420);
      setPrepStep(i);
    }
    await delay(300);

    setPhase("analyzing");
    try {
      const res  = await fetch("/api/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText.trim(), model }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analisis gagal");
      setResult(json);
      setHistory((h) => [{
        ...json, inputText: inputText.trim(), timestamp: new Date(),
      }, ...h].slice(0, 6));
      setPhase("done");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Analisis gagal");
      setPhase("idle");
    }
  }, [inputText, model]);

  const handleReset = useCallback(() => {
    setPhase("idle");
    setPrepStep(-1);
    setResult(null);
    setErrMsg(null);
  }, []);

  const labelColor = (l?: string) =>
    l === "Positif" ? "#22c55e" : l === "Negatif" ? "#ef4444" : "#eab308";
  const labelBg = (l?: string) =>
    l === "Positif" ? "rgba(34,197,94,0.1)" : l === "Negatif" ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)";
  const labelEmoji = (l?: string) =>
    l === "Positif" ? "😊" : l === "Negatif" ? "😞" : "😐";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", color: "var(--text-primary)" }}>

      {/* ── Sticky nav ─────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "var(--bg-surface)", borderBottom: "1px solid var(--border)",
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between" style={{ height: 52 }}>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
                  style={{ color: "var(--text-secondary)" }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Dashboard
            </Link>
            <span style={{ color: "var(--text-muted)" }}>›</span>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Analisis Teks Langsung
            </span>
          </div>
          <Link href="/penjelasan" className="text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            📖 Cara Kerja
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            Analisis Sentimen Teks Langsung
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Ketik atau paste teks Bahasa Indonesia. SentiScope akan menunjukkan setiap langkah
            preprocessing secara interaktif, lalu mengklasifikasikan sentimennya menggunakan model yang Anda pilih.
          </p>
        </div>

        {/* ── Input Card ───────────────────────────────────────────────── */}
        <div className="card p-5 animate-fade-in">

          {/* Example chips */}
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2"
               style={{ color: "var(--text-muted)" }}>Coba Contoh Teks</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex.label} onClick={() => { setInputText(ex.text); setCharCount(ex.text.length); handleReset(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--clr-primary)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}>
                  {ex.icon} {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* Textarea */}
          <div className="relative mb-4">
            <textarea
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Ketik atau paste teks Bahasa Indonesia di sini...

Contoh: 'Pelayanan sangat buruk dan mengecewakan, petugas tidak ramah sama sekali!'"
              className="input"
              rows={5}
              maxLength={2000}
              style={{ resize: "vertical", fontFamily: "inherit", fontSize: 14, lineHeight: 1.6 }}
              disabled={phase === "preprocessing" || phase === "analyzing"}
            />
            <span className="absolute bottom-2 right-3 text-xs" style={{ color: "var(--text-muted)" }}>
              {charCount}/2000
            </span>
          </div>

          {/* Model selector */}
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2"
               style={{ color: "var(--text-muted)" }}>Pilih Model Analisis</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MODELS.map((m) => (
                <button key={m.id} onClick={() => { setModel(m.id); handleReset(); }}
                        className="flex flex-col items-start p-3 rounded-xl text-left transition-all"
                        style={model === m.id
                          ? { background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.4)", color: "var(--text-primary)" }
                          : { background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <div className="flex items-center gap-2 mb-0.5 w-full">
                    <span className="text-base">{m.icon}</span>
                    <span className="text-xs font-bold">{m.name}</span>
                    {m.recommended && (
                      <span className="ml-auto text-xs px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}>
                        ✓ Rekomendasi
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.desc}</p>
                  {m.waitNote && model === m.id && (
                    <p className="text-xs mt-1" style={{ color: "#f59e0b" }}>{m.waitNote}</p>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              💡 IndoBERTweet tidak tersedia di sini (memerlukan CSV pre-computed dari Python).
            </p>
          </div>

          {/* Error */}
          {errMsg && (
            <div className="mb-4 p-3 rounded-lg text-sm"
                 style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
              ⚠ {errMsg}
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={!inputText.trim() || phase === "preprocessing" || phase === "analyzing"}
              className="btn-primary"
              style={(!inputText.trim() || phase !== "idle") ? { opacity: 0.5, cursor: "not-allowed" } : {}}>
              {phase === "preprocessing" ? (
                <span className="flex items-center gap-2">
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                  Memproses teks...
                </span>
              ) : phase === "analyzing" ? (
                <span className="flex items-center gap-2">
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                  Menganalisis sentimen...
                </span>
              ) : (
                "▶ Analisis Sekarang"
              )}
            </button>
            {(phase === "done" || phase === "idle") && (inputText || result) && (
              <button onClick={() => { setInputText(""); setCharCount(0); handleReset(); }}
                      className="btn-ghost text-sm">
                ↺ Bersihkan
              </button>
            )}
          </div>
        </div>

        {/* ── Preprocessing Pipeline ────────────────────────────────────── */}
        {(phase === "preprocessing" || phase === "analyzing" || phase === "done") && prep && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                   style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                🧹
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  Preprocessing Pipeline — Step by Step
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Transformasi teks mentah sebelum dikirim ke model analisis
                </p>
              </div>
            </div>

            {/* Input preview */}
            <div className="mb-4 p-3 rounded-lg"
                 style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Teks Asli (Input)</p>
              <p className="text-sm font-mono break-words" style={{ color: "var(--text-primary)" }}>
                "{prep.raw}"
              </p>
            </div>

            <div className="space-y-2">
              {PREP_STEPS.map((step, i) => {
                const active  = prepStep >= i;
                const current = prepStep === i && (phase === "preprocessing");

                const getText = () => {
                  switch (i) {
                    case 0: return null; // emoji step shown separately
                    case 1: return prep.cleaned;
                    case 2: return prep.normalized;
                    case 3: return prep.noStopword;
                    case 4: return prep.stemmed;
                    case 5: return prep.tokens.join("  ·  ");
                    default: return "";
                  }
                };

                return (
                  <div key={step.id}
                       className="rounded-xl overflow-hidden transition-all duration-500"
                       style={{
                         border: `1px solid ${active ? step.color + "55" : "var(--border)"}`,
                         background: active ? `${step.color}0c` : "transparent",
                         opacity: prepStep < 0 ? 0.3 : active ? 1 : 0.35,
                       }}>
                    <div className="flex items-start gap-3 p-3">
                      {/* Icon + connector */}
                      <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                             style={{
                               background: active ? step.color : "var(--bg-input)",
                               color: active ? "#fff" : "var(--text-muted)",
                               boxShadow: current ? `0 0 12px ${step.color}70` : "none",
                               transition: "all 0.4s ease",
                             }}>
                          {active ? step.icon : String(i + 1)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs font-bold" style={{ color: active ? step.color : "var(--text-muted)" }}>
                            {step.label}
                          </p>
                          {current && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse-soft"
                                  style={{ background: `${step.color}25`, color: step.color }}>
                              ⚡ aktif
                            </span>
                          )}
                        </div>
                        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{step.desc}</p>

                        {active && (
                          <div className="space-y-1.5">
                            {/* Emoji step */}
                            {i === 0 && (
                              <div className="flex flex-wrap gap-3">
                                <span className="text-xs px-2.5 py-1 rounded-lg"
                                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                                  Emoji ditemukan: <strong style={{ color: step.color }}>
                                    {prep.emojis.length > 0 ? prep.emojis.join(" ") : "—"}
                                  </strong>
                                </span>
                                <span className="text-xs px-2.5 py-1 rounded-lg"
                                      style={{
                                        background: "var(--bg-surface)", border: "1px solid var(--border)",
                                        color: prep.emojiScore < 0 ? "#ef4444" : prep.emojiScore > 0 ? "#22c55e" : "var(--text-secondary)",
                                      }}>
                                  Skor emoji: <strong>{prep.emojiScore > 0 ? "+" : ""}{prep.emojiScore}</strong>
                                </span>
                              </div>
                            )}

                            {/* Text result */}
                            {i > 0 && getText() && (
                              <div className="rounded-lg p-2.5 font-mono text-xs break-words"
                                   style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                                {i === 5 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {prep.tokens.map((t, ti) => (
                                      <span key={ti} className="px-2 py-0.5 rounded-full"
                                            style={{ background: `${step.color}20`, color: step.color, fontWeight: 700 }}>
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                ) : getText()}
                              </div>
                            )}

                            {/* Delta info */}
                            {i === 2 && prep.removedSlang.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {prep.removedSlang.slice(0, 8).map(([from, to]) => (
                                  <span key={from} className="text-xs px-2 py-0.5 rounded"
                                        style={{ background: "rgba(244,114,182,0.12)", color: "#f472b6" }}>
                                    {from} → {to}
                                  </span>
                                ))}
                              </div>
                            )}
                            {i === 3 && prep.removedStop.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Dihapus:</span>
                                {prep.removedStop.slice(0, 10).map((w) => (
                                  <span key={w} className="text-xs px-2 py-0.5 rounded line-through"
                                        style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                                    {w}
                                  </span>
                                ))}
                                {prep.removedStop.some((w) => KEEP_WORDS.has(w)) === false && prep.tokens.some((t) => KEEP_WORDS.has(t)) && (
                                  <>
                                    <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>Dipertahankan:</span>
                                    {prep.tokens.filter((t) => KEEP_WORDS.has(t)).map((w) => (
                                      <span key={w} className="text-xs px-2 py-0.5 rounded"
                                            style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                                        {w} ✓
                                      </span>
                                    ))}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Token summary */}
            {prepStep >= PREP_STEPS.length - 1 && (
              <div className="mt-4 p-4 rounded-xl animate-slide-up"
                   style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <p className="text-xs font-bold mb-2" style={{ color: "#22c55e" }}>
                  ✅ Preprocessing selesai — Token siap untuk model inference
                </p>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="rounded-lg p-2" style={{ background: "var(--bg-surface)" }}>
                    <p style={{ color: "var(--text-muted)" }}>Token Bersih</p>
                    <p className="text-lg font-black" style={{ color: "#22c55e" }}>{prep.tokens.length}</p>
                  </div>
                  <div className="rounded-lg p-2" style={{ background: "var(--bg-surface)" }}>
                    <p style={{ color: "var(--text-muted)" }}>Emoji Score</p>
                    <p className="text-lg font-black" style={{
                      color: prep.emojiScore < 0 ? "#ef4444" : prep.emojiScore > 0 ? "#22c55e" : "#94a3b8"
                    }}>
                      {prep.emojiScore > 0 ? "+" : ""}{prep.emojiScore}
                    </p>
                  </div>
                  <div className="rounded-lg p-2" style={{ background: "var(--bg-surface)" }}>
                    <p style={{ color: "var(--text-muted)" }}>Slang Dinormalisasi</p>
                    <p className="text-lg font-black" style={{ color: "#f472b6" }}>{prep.removedSlang.length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Analyzing spinner */}
            {phase === "analyzing" && (
              <div className="mt-4 flex items-center gap-3 p-4 rounded-xl animate-slide-up"
                   style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}>
                <span className="spinner" style={{ width: 20, height: 20, flexShrink: 0 }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--clr-primary)" }}>
                    Mengirim ke model {MODELS.find((m) => m.id === model)?.name}...
                  </p>
                  {model === "mbert_js" && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      mBERT JS membutuhkan waktu lebih lama jika belum di-cache. Harap tunggu.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Result Card ───────────────────────────────────────────────── */}
        {phase === "done" && result && (
          <div ref={resultRef} className="card p-6 animate-slide-up"
               style={{ borderColor: `${labelColor(result.label)}40`, background: labelBg(result.label) }}>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1"
                   style={{ color: "var(--text-muted)" }}>Hasil Analisis Sentimen</p>
                <div className="flex items-center gap-3">
                  <span className="text-5xl">{labelEmoji(result.label)}</span>
                  <div>
                    <p className="text-3xl font-extrabold" style={{ color: labelColor(result.label) }}>
                      {result.label.toUpperCase()}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {result.modelDescription}
                    </p>
                  </div>
                </div>
              </div>
              <button onClick={handleReset} className="btn-ghost text-xs py-1.5 px-3 shrink-0">
                ↺ Analisis Ulang
              </button>
            </div>

            {/* Score meter */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Skor Sentimen</p>
                <span className="text-sm font-black"
                      style={{ color: labelColor(result.label) }}>
                  {result.score > 0 ? "+" : ""}{(result.score * 100).toFixed(1)}%
                </span>
              </div>
              {/* -1 to +1 meter */}
              <div className="relative h-4 rounded-full overflow-hidden"
                   style={{ background: "var(--bg-input)" }}>
                {/* Color gradient background */}
                <div className="absolute inset-0 rounded-full" style={{
                  background: "linear-gradient(to right, #ef4444 0%, #eab308 50%, #22c55e 100%)",
                  opacity: 0.2,
                }} />
                {/* Score needle */}
                <div className="absolute top-0 bottom-0 w-1 rounded-full transition-all duration-700"
                     style={{
                       left: `calc(${((result.score + 1) / 2) * 100}% - 2px)`,
                       background: labelColor(result.label),
                       boxShadow: `0 0 8px ${labelColor(result.label)}`,
                     }} />
                {/* Center line */}
                <div className="absolute top-0 bottom-0 w-px" style={{ left: "50%", background: "var(--border-strong)" }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: "#ef4444" }}>Negatif</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Netral</span>
                <span className="text-xs" style={{ color: "#22c55e" }}>Positif</span>
              </div>
            </div>

            {/* Token analysis */}
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2 uppercase tracking-widest"
                 style={{ color: "var(--text-muted)" }}>Token yang Dianalisis (hasil preprocessing aktual)</p>
              {result.tokens.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {result.tokens.map((t, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold"
                          style={{
                            background: KEEP_WORDS.has(t)
                              ? t.startsWith("tidak") || t.startsWith("bukan") || t.startsWith("jangan")
                                ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.15)"
                              : `${labelColor(result.label)}15`,
                            color: KEEP_WORDS.has(t)
                              ? t.startsWith("tidak") || t.startsWith("bukan") || t.startsWith("jangan")
                                ? "#ef4444" : "#3b82f6"
                              : labelColor(result.label),
                            border: `1px solid ${KEEP_WORDS.has(t) ? "rgba(100,100,200,0.2)" : `${labelColor(result.label)}30`}`,
                          }}>
                      {t}
                      {KEEP_WORDS.has(t) && (t.includes("tidak") || t.includes("bukan") || t.includes("jangan")) && (
                        <span className="ml-1 opacity-70">¬</span>
                      )}
                      {KEEP_WORDS.has(t) && (t.includes("sangat") || t.includes("banget") || t.includes("sekali")) && (
                        <span className="ml-1 opacity-70">×</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Tidak ada token yang tersisa setelah preprocessing. Coba teks yang lebih panjang.
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="px-1.5 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>¬</span>
                  {" "}= kata negasi
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="px-1.5 rounded" style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>×</span>
                  {" "}= intensifier
                </span>
              </div>
            </div>

            {/* Clean text */}
            {result.cleanText && (
              <div className="mb-4 p-3 rounded-lg"
                   style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                  Teks Bersih (dari server — nusantara-nlp aktual)
                </p>
                <p className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>{result.cleanText}</p>
              </div>
            )}

            {/* Model badge */}
            <div className="flex flex-wrap gap-2">
              <span className="badge text-xs"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                🔧 {result.modelDescription}
              </span>
              <span className="badge text-xs"
                    style={{ background: `${labelColor(result.label)}15`, border: `1px solid ${labelColor(result.label)}30`, color: labelColor(result.label) }}>
                {result.label} · skor {result.score > 0 ? "+" : ""}{result.score.toFixed(3)}
              </span>
            </div>

            {/* Re-analyze with other models */}
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                Bandingkan dengan model lain:
              </p>
              <div className="flex flex-wrap gap-2">
                {MODELS.filter((m) => m.id !== model).map((m) => (
                  <button key={m.id} onClick={() => { setModel(m.id); handleReset(); }}
                          className="btn-ghost text-xs py-1.5 px-3">
                    {m.icon} Coba {m.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── History ───────────────────────────────────────────────────── */}
        {history.length > 0 && (
          <div className="animate-fade-in">
            <p className="text-xs font-bold uppercase tracking-widest mb-3"
               style={{ color: "var(--text-muted)" }}>Riwayat Sesi Ini</p>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="card p-3 flex items-center gap-3 cursor-pointer transition-all hover:opacity-80"
                     style={{ borderLeft: `3px solid ${labelColor(h.label)}` }}
                     onClick={() => { setInputText(h.inputText); setCharCount(h.inputText.length); handleReset(); }}>
                  <span className="text-xl shrink-0">{labelEmoji(h.label)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: "var(--text-primary)" }}>{h.inputText}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {h.label} · {MODELS.find((m) => m.id === h.model)?.name} ·{" "}
                      {h.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: labelColor(h.label) }}>
                    {h.score > 0 ? "+" : ""}{(h.score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Info footer ───────────────────────────────────────────────── */}
        <div className="card p-4 text-xs" style={{ background: "var(--bg-surface)" }}>
          <p className="font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>ℹ Catatan Penting</p>
          <ul className="space-y-1" style={{ color: "var(--text-muted)" }}>
            <li>• Preprocessing di atas adalah <strong>simulasi visual</strong>. Hasil teks bersih dari server (nusantara-nlp aktual) ditampilkan di kartu hasil.</li>
            <li>• IndoBERTweet tidak tersedia untuk input teks langsung — butuh file CSV hasil Python. Gunakan model lain, atau <Link href="/" className="underline hover:opacity-70">upload CSV</Link> di dashboard.</li>
            <li>• mBERT JS: request pertama lambat (~5-15 menit) karena download model ONNX 170MB. Selanjutnya instan.</li>
            <li>• Teks Anda <strong>tidak disimpan</strong> ke server atau database — hanya diproses sementara untuk analisis.</li>
          </ul>
        </div>

        <div className="flex justify-between items-center pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          <Link href="/" className="btn-ghost text-sm gap-2">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Dashboard
          </Link>
          <Link href="/penjelasan" className="btn-ghost text-sm gap-2">
            📖 Cara Kerja Lengkap
          </Link>
        </div>

      </div>
    </div>
  );
}
