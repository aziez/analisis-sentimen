/**
 * lib/textMining.ts
 * Client-safe text mining utilities: N-gram, TF-IDF, word cloud, lexical diversity.
 * No Node.js dependencies — safe to import in client components.
 */

import type { SentimentResult } from "./sentimentEngine";

export const STOPWORDS = new Set([
  "yang","dan","di","ke","dari","ini","itu","dengan","untuk","tidak","ada","juga",
  "sudah","bisa","akan","pada","nya","kami","saya","kamu","pak","bu","bapak","ibu",
  "kita","mereka","dia","aku","mah","sih","lah","deh","tuh","gak","ga","aja","nih",
  "yg","jadi","kalau","kalo","mau","buat","lebih","sama","satu","harus","masih",
  "pun","kan","kayak","kyk","tapi","lagi","kok","dong","atau","oleh","karena",
  "adalah","bahwa","serta","jika","maka","namun","tetapi","namanya","sdh","blm",
  "the","a","an","is","in","it","of","to","and","or","was","are","be","but","for",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

// ── N-gram ────────────────────────────────────────────────────────────────────

export interface NGram {
  phrase: string;
  count: number;
}

export function computeNGrams(texts: string[], n: number, topK = 30): NGram[] {
  const freq = new Map<string, number>();
  for (const text of texts) {
    const tokens = tokenize(text);
    for (let i = 0; i <= tokens.length - n; i++) {
      const gram = tokens.slice(i, i + n).join(" ");
      freq.set(gram, (freq.get(gram) ?? 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, topK)
    .map(([phrase, count]) => ({ phrase, count }));
}

// ── TF-IDF Keywords per sentiment label ──────────────────────────────────────

export interface KeywordEntry {
  word: string;
  tfidf: number;
  count: number;
}

export function computeTFIDF(
  results: SentimentResult[],
  label: "Positif" | "Negatif" | "Netral",
  topK = 15
): KeywordEntry[] {
  const targetTexts = results.filter((r) => r.label === label).map((r) => r.Teks_Bersih || r.text);
  const allTexts    = results.map((r) => r.Teks_Bersih || r.text);

  const targetFreq = new Map<string, number>();
  for (const text of targetTexts)
    for (const w of tokenize(text)) targetFreq.set(w, (targetFreq.get(w) ?? 0) + 1);

  const dfMap = new Map<string, number>();
  for (const text of allTexts) {
    const uniq = new Set(tokenize(text));
    for (const w of uniq) dfMap.set(w, (dfMap.get(w) ?? 0) + 1);
  }

  const N = allTexts.length || 1;
  const scores: KeywordEntry[] = [];
  for (const [word, count] of targetFreq.entries()) {
    if (count < 2) continue;
    const tf  = count / (targetTexts.length || 1);
    const idf = Math.log(N / (1 + (dfMap.get(word) ?? 0))) + 1;
    scores.push({ word, tfidf: parseFloat((tf * idf).toFixed(4)), count });
  }
  return scores.sort((a, b) => b.tfidf - a.tfidf).slice(0, topK);
}

// ── Word cloud data ───────────────────────────────────────────────────────────

export function computeWordCloud(
  results: SentimentResult[],
  label?: "Positif" | "Negatif" | "Netral",
  topK = 60
): { word: string; count: number }[] {
  const texts = (label ? results.filter((r) => r.label === label) : results)
    .map((r) => r.Teks_Bersih || r.text);

  const freq = new Map<string, number>();
  for (const text of texts)
    for (const w of tokenize(text)) freq.set(w, (freq.get(w) ?? 0) + 1);

  return Array.from(freq.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, topK)
    .map(([word, count]) => ({ word, count }));
}

// ── Lexical diversity ─────────────────────────────────────────────────────────

export interface LexicalDiversity {
  ttr: number;
  totalTokens: number;
  uniqueTokens: number;
  avgWordLength: number;
  avgTextLength: number;
}

export function computeLexicalDiversity(texts: string[]): LexicalDiversity {
  const allTokens: string[] = [];
  for (const t of texts) allTokens.push(...tokenize(t));

  if (!allTokens.length)
    return { ttr: 0, totalTokens: 0, uniqueTokens: 0, avgWordLength: 0, avgTextLength: 0 };

  const unique = new Set(allTokens);
  return {
    ttr:          parseFloat((unique.size / allTokens.length).toFixed(4)),
    totalTokens:  allTokens.length,
    uniqueTokens: unique.size,
    avgWordLength:parseFloat((allTokens.reduce((s, w) => s + w.length, 0) / allTokens.length).toFixed(2)),
    avgTextLength:parseFloat((allTokens.length / (texts.length || 1)).toFixed(2)),
  };
}

// ── Confidence histogram ──────────────────────────────────────────────────────

export interface HistoBucket { range: string; count: number }

export function computeConfidenceHistogram(results: SentimentResult[], bins = 10): HistoBucket[] {
  const scores = results.map((r) => Math.abs(r.score));
  return Array.from({ length: bins }, (_, i) => {
    const lo = i / bins, hi = (i + 1) / bins;
    return {
      range: `${Math.round(lo * 100)}-${Math.round(hi * 100)}%`,
      count: scores.filter((s) => s >= lo && (i === bins - 1 ? s <= hi : s < hi)).length,
    };
  });
}

// ── Author analysis ───────────────────────────────────────────────────────────

export interface AuthorStat {
  author: string;
  total: number;
  positif: number;
  negatif: number;
  netral: number;
  avgScore: number;
  avgReactions: number;
}

export function computeAuthorStats(results: SentimentResult[], topK = 20): AuthorStat[] {
  const map = new Map<string, AuthorStat>();

  for (const r of results) {
    const name = r.author_name?.trim() || "Unknown";
    if (!map.has(name))
      map.set(name, { author: name, total: 0, positif: 0, negatif: 0, netral: 0, avgScore: 0, avgReactions: 0 });
    const s = map.get(name)!;
    s.total++;
    if (r.label === "Positif") s.positif++;
    else if (r.label === "Negatif") s.negatif++;
    else s.netral++;
    s.avgScore += r.score;
    s.avgReactions += parseFloat(r.reaction_count ?? "0") || 0;
  }

  return Array.from(map.values())
    .map((s) => ({
      ...s,
      avgScore:     parseFloat((s.avgScore / s.total).toFixed(4)),
      avgReactions: parseFloat((s.avgReactions / s.total).toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topK);
}
