/**
 * lib/sentimentEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified sentiment computation layer untuk dashboard.
 *
 * ┌─────────────────┬────────────────────────────────────────────────────────┐
 * │ Model ID        │ Sumber / Algoritma                                     │
 * ├─────────────────┼────────────────────────────────────────────────────────┤
 * │ indobertweet    │ hasil_sentimen_fb.csv — OUTPUT dari sentimen_analisis.py│
 * │                 │ (IndoBERTweet + nusantara-nlp preprocessing)           │
 * │                 │ ✅ SAMA PERSIS dengan skrip Python utama               │
 * ├─────────────────┼────────────────────────────────────────────────────────┤
 * │ mbert_js        │ @xenova/transformers (JS-native, tanpa Python)         │
 * │                 │ Model: bert-base-multilingual-uncased-sentiment (ONNX) │
 * │                 │ 🔬 Perbandingan: Python IndoBERTweet vs JS mBERT       │
 * ├─────────────────┼────────────────────────────────────────────────────────┤
 * │ indonesia_lexicon│ InSet Lexicon (Bahasa Indonesia, berbasis kamus)      │
 * ├─────────────────┼────────────────────────────────────────────────────────┤
 * │ rule_based_id   │ InSet + negasi & intensifier + nusantara-nlp           │
 * ├─────────────────┼────────────────────────────────────────────────────────┤
 * │ vader           │ vader-sentiment (npm) — lexicon English VADER          │
 * │                 │ Untuk perbandingan saja                                 │
 * ├─────────────────┼────────────────────────────────────────────────────────┤
 * │ textblob        │ sentiment (npm) — AFINN-based, mirip TextBlob polarity │
 * │                 │ Untuk perbandingan saja                                 │
 * └─────────────────┴────────────────────────────────────────────────────────┘
 *
 * Label yang dikembalikan selalu dalam format Indonesia:
 *   "Positif" | "Negatif" | "Netral"
 *
 * Hal ini konsisten dengan label di sentimen_analisis.py (LABEL_MAP):
 *   "Positive" → "Positif"
 *   "Negative" → "Negatif"
 *   "Neutral"  → "Netral"
 */

import { Comment, PrecomputedRow, loadPrecomputed } from "./csvLoader";

export type SentimentLabel = "Positif" | "Negatif" | "Netral";

export interface SentimentResult {
  author_name: string;
  text: string;
  Teks_Bersih?: string;
  timestamp: string;
  reaction_count: string;
  reply_count: string;
  /** Label bahasa Indonesia: Positif | Negatif | Netral */
  label: SentimentLabel;
  /**
   * Skor ternormalisasi:
   * - indobertweet : Skor_Keyakinan / 100  (0–1, dari hasil Python)
   * - vader        : compound score        (-1 hingga +1)
   * - textblob     : comparative score normalized (-1 hingga +1)
   */
  score: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// MODEL 1: IndoBERTweet (pre-computed dari sentimen_analisis.py)
// ──────────────────────────────────────────────────────────────────────────────
function analyzeIndoBERTweet(): SentimentResult[] {
  const rows: PrecomputedRow[] = loadPrecomputed();

  return rows.map((r): SentimentResult => {
    const raw = (r.Sentimen ?? "").trim();

    // Normalisasi label (sudah dalam bahasa Indonesia dari Python script)
    let label: SentimentLabel = "Netral";
    if (raw === "Positif") label = "Positif";
    else if (raw === "Negatif") label = "Negatif";
    else if (raw === "Netral") label = "Netral";

    // Skor keyakinan model (0–100 dari Python) → normalisasi ke 0–1
    // Skor negatif untuk sentimen Negatif (konsisten dengan VADER compound)
    const rawScore = parseFloat(r.Skor_Keyakinan ?? "0") / 100;
    const signedScore =
      label === "Negatif" ? -rawScore : label === "Positif" ? rawScore : 0;

    return {
      author_name: r.author_name ?? "",
      text: r.text ?? "",
      Teks_Bersih: r.Teks_Bersih ?? "",
      timestamp: r.timestamp ?? "",
      reaction_count: r.reaction_count ?? "0",
      reply_count: r.reply_count ?? "0",
      label,
      score: parseFloat(signedScore.toFixed(4)),
    };
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// MODEL 2: VADER (npm vader-sentiment) — hanya untuk perbandingan
// Compound >= 0.05 → Positif, <= -0.05 → Negatif, else → Netral
// ──────────────────────────────────────────────────────────────────────────────
async function analyzeVader(comments: Comment[]): Promise<SentimentResult[]> {
  const { SentimentIntensityAnalyzer } = await import("vader-sentiment");

  return comments.map((c): SentimentResult => {
    const scores = SentimentIntensityAnalyzer.polarity_scores(c.text ?? "");
    const compound: number = scores.compound ?? 0;
    let label: SentimentLabel = "Netral";
    if (compound >= 0.05) label = "Positif";
    else if (compound <= -0.05) label = "Negatif";

    return {
      author_name: c.author_name,
      text: c.text,
      timestamp: c.timestamp,
      reaction_count: c.reaction_count,
      reply_count: c.reply_count,
      label,
      score: parseFloat(compound.toFixed(4)),
    };
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// MODEL 3: TextBlob-equivalent (npm sentiment/AFINN) — hanya untuk perbandingan
// Comparative > 0 → Positif, < 0 → Negatif, = 0 → Netral
// ──────────────────────────────────────────────────────────────────────────────
async function analyzeTextblob(comments: Comment[]): Promise<SentimentResult[]> {
  const Sentiment = (await import("sentiment")).default;
  const engine = new Sentiment();

  return comments.map((c): SentimentResult => {
    const result = engine.analyze(c.text ?? "");
    const comparative: number = result.comparative ?? 0;
    let label: SentimentLabel = "Netral";
    if (comparative > 0) label = "Positif";
    else if (comparative < 0) label = "Negatif";

    // Normalisasi ke -1..+1 (clamp ±5)
    const normalized = Math.max(-1, Math.min(1, comparative / 5));

    return {
      author_name: c.author_name,
      text: c.text,
      timestamp: c.timestamp,
      reaction_count: c.reaction_count,
      reply_count: c.reply_count,
      label,
      score: parseFloat(normalized.toFixed(4)),
    };
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// MODEL 4: InSet Lexicon (Bahasa Indonesia) — nusantara-nlp preprocessing
// ──────────────────────────────────────────────────────────────────────────────
async function analyzeIndonesianLexicon(comments: Comment[]): Promise<SentimentResult[]> {
  const { scoreWithInSet } = await import("./indonesianLexicon");

  return comments.map((c): SentimentResult => {
    const s = scoreWithInSet(c.text ?? "");
    let label: SentimentLabel = "Netral";
    if (s >= 0.05) label = "Positif";
    else if (s <= -0.05) label = "Negatif";

    return {
      author_name: c.author_name,
      text: c.text,
      timestamp: c.timestamp,
      reaction_count: c.reaction_count,
      reply_count: c.reply_count,
      label,
      score: parseFloat(s.toFixed(4)),
    };
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// MODEL 5: Rule-Based Indonesian — InSet + negasi + intensifier
// ──────────────────────────────────────────────────────────────────────────────
async function analyzeRuleBasedID(comments: Comment[]): Promise<SentimentResult[]> {
  const { scoreWithRuleBased } = await import("./indonesianLexicon");

  return comments.map((c): SentimentResult => {
    const s = scoreWithRuleBased(c.text ?? "");
    let label: SentimentLabel = "Netral";
    if (s >= 0.05) label = "Positif";
    else if (s <= -0.05) label = "Negatif";

    return {
      author_name: c.author_name,
      text: c.text,
      timestamp: c.timestamp,
      reaction_count: c.reaction_count,
      reply_count: c.reply_count,
      label,
      score: parseFloat(s.toFixed(4)),
    };
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// MODEL 6: mBERT via @xenova/transformers (JS-native Transformer)
// ─────────────────────────────────────────────────────────────────────────────
// Model: Xenova/bert-base-multilingual-uncased-sentiment
//   → nlptown/bert-base-multilingual-uncased-sentiment dikonversi ke ONNX
//   → Output: "1 star"–"5 stars"
//   → 1-2★ = Negatif | 3★ = Netral | 4-5★ = Positif
//
// ⚠️  LAMBAT: ~2–10 menit untuk 1000+ komentar (pertama kali)
//     Gunakan disk cache (jsModelCache) untuk akses berikutnya.
// ──────────────────────────────────────────────────────────────────────────────
async function analyzeXenovaMBERT(
  comments: Comment[],
  onProgress?: (done: number, total: number) => void
): Promise<SentimentResult[]> {
  const { getMBERTPipeline } = await import("./xenovaLoader");
  // Import fungsi preprocessing yang sama dengan pipeline Python (nusantara-nlp)
  const { preprocessIDText } = await import("./indonesianLexicon");

  const pipe = await getMBERTPipeline();

  const results: SentimentResult[] = [];
  const total = comments.length;

  for (let i = 0; i < total; i++) {
    const c = comments[i];

    // ── Preprocessing — sama dengan sentimen_analisis.py ──────────────────────
    // 1. Jalankan nusantara-nlp pipeline: slang normalization + stopword removal + stemming
    const preprocessed = preprocessIDText(c.text ?? "");
    // 2. Batasi panjang ke 512 karakter (BERT token limit ~512 token ≈ 400-500 char)
    const bertInput = (preprocessed || c.text || "").slice(0, 512);

    let label: SentimentLabel = "Netral";
    let score = 0;

    try {
      const output = await pipe(bertInput, { topk: 1 });
      const top = output[0];
      // top.label: "1 star" | "2 stars" | "3 stars" | "4 stars" | "5 stars"
      const stars = parseInt((top.label as string).split(" ")[0], 10);
      if (stars >= 4) {
        label = "Positif";
        score = parseFloat((top.score as number).toFixed(4));
      } else if (stars <= 2) {
        label = "Negatif";
        score = parseFloat((-(top.score as number)).toFixed(4));
      } else {
        label = "Netral";
        score = 0;
      }
    } catch {
      // Jika inference gagal untuk satu komentar, default ke Netral
      label = "Netral";
      score = 0;
    }

    results.push({
      author_name: c.author_name,
      text: c.text,
      timestamp: c.timestamp,
      reaction_count: c.reaction_count,
      reply_count: c.reply_count,
      label,
      score,
    });

    if (onProgress) onProgress(i + 1, total);
  }

  return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// Public dispatcher
// ──────────────────────────────────────────────────────────────────────────────
export async function analyzeSentiment(
  comments: Comment[],
  model: string
): Promise<SentimentResult[]> {
  switch (model) {
    case "indobertweet":
      return analyzeIndoBERTweet();
    case "mbert_js":
      return analyzeXenovaMBERT(comments);
    case "indonesia_lexicon":
      return analyzeIndonesianLexicon(comments);
    case "rule_based_id":
      return analyzeRuleBasedID(comments);
    case "textblob":
      return analyzeTextblob(comments);
    case "vader":
    default:
      return analyzeVader(comments);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Aggregate helpers
// ──────────────────────────────────────────────────────────────────────────────

export interface Aggregates {
  distribution: { Positif: number; Netral: number; Negatif: number };
  timeSeries: { date: string; Positif: number; Netral: number; Negatif: number }[];
  topWords: { word: string; count: number }[];
  totalComments: number;
  averageScore: number;
  /** Hanya tersedia untuk model indobertweet — rata-rata Skor_Keyakinan asli (0-100) */
  avgConfidencePct?: number;
}

/** Stopwords Bahasa Indonesia + Inggris umum */
const STOPWORDS = new Set([
  "yang", "dan", "di", "ke", "dari", "ini", "itu", "dengan", "untuk", "tidak",
  "ada", "juga", "sudah", "bisa", "akan", "pada", "nya", "kami", "saya", "kamu",
  "pak", "bu", "bapak", "ibu", "kita", "mereka", "dia", "aku", "mah", "sih",
  "lah", "deh", "tuh", "gak", "ga", "aja", "nih", "yg", "jadi", "kalau", "kalo",
  "mau", "buat", "lebih", "sama", "juga", "satu", "bisa", "harus", "masih",
  "the", "a", "an", "is", "in", "it", "of", "to", "and", "or", "was", "are",
  "be", "but", "for", "on", "at", "by", "as", "we", "with", "he", "she", "they",
  "i", "you", "this", "that", "so", "do", "my", "me", "no", "not", "have", "has",
]);

export function computeAggregates(results: SentimentResult[]): Aggregates {
  const distribution = { Positif: 0, Netral: 0, Negatif: 0 };
  let totalScore = 0;

  const dateMap = new Map<string, { Positif: number; Netral: number; Negatif: number }>();
  const wordFreq = new Map<string, number>();

  for (const r of results) {
    distribution[r.label]++;
    totalScore += r.score;

    // Bucket by date (YYYY-MM-DD)
    let dateKey = "unknown";
    if (r.timestamp) {
      try {
        const d = new Date(r.timestamp);
        if (!isNaN(d.getTime())) dateKey = d.toISOString().slice(0, 10);
      } catch { }
    }
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, { Positif: 0, Netral: 0, Negatif: 0 });
    dateMap.get(dateKey)![r.label]++;

    // Word frequency — pakai Teks_Bersih jika ada (hasil preprocessing Python)
    const sourceText = (r.Teks_Bersih && r.Teks_Bersih.length > 3)
      ? r.Teks_Bersih
      : (r.text ?? "");

    const words = sourceText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

    for (const w of words) {
      wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
    }
  }

  const timeSeries = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  const topWords = Array.from(wordFreq.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  return {
    distribution,
    timeSeries,
    topWords,
    totalComments: results.length,
    averageScore:
      results.length > 0 ? parseFloat((totalScore / results.length).toFixed(4)) : 0,
  };
}
