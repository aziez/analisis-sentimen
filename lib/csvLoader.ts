/**
 * lib/csvLoader.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dua loader CSV:
 *
 *  1. loadComments()        → fb_comments.csv (data mentah scraping)
 *  2. loadPrecomputed()     → hasil_sentimen_fb.csv (output sentimen_analisis.py)
 *                             Model: IndoBERTweet + nusantara-nlp preprocessing
 *                             Label : Positif | Negatif | Netral
 *
 * Keduanya memprioritaskan folder /public/data/ (agar bisa dibaca di Vercel).
 * Jika tidak ditemukan, fallback ke /data/ (dev lokal).
 */

import fs from "fs";
import path from "path";
import Papa from "papaparse";

// ── Tipe data komentar mentah ──────────────────────────────────────────────
export interface Comment {
  id: string;
  author_name: string;
  author_id: string;
  text: string;
  timestamp: string;
  reaction_count: string;
  reply_count: string;
}

// ── Tipe data hasil pre-computed IndoBERTweet ──────────────────────────────
export interface PrecomputedRow {
  author_name: string;
  text: string;
  Teks_Bersih: string;
  timestamp: string;
  reaction_count: string;
  reply_count: string;
  /** "Positif" | "Negatif" | "Netral" — label bahasa Indonesia */
  Sentimen: string;
  /** Skor keyakinan model 0–100 */
  Skor_Keyakinan: string;
}

// ── Cache in-process ───────────────────────────────────────────────────────
let _commentsCache: Comment[] | null = null;
let _precomputedCache: PrecomputedRow[] | null = null;

function resolveDataPath(filename: string): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "data", filename),
    path.join(process.cwd(), "data", filename),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function parseCSV<T>(filepath: string): T[] {
  const raw = fs.readFileSync(filepath, "utf-8");
  const result = Papa.parse<T>(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return result.data;
}

// ── 1. Data mentah (fb_comments.csv) ──────────────────────────────────────
export function loadComments(): Comment[] {
  if (_commentsCache) return _commentsCache;
  const p = resolveDataPath("fb_comments.csv");
  if (!p) throw new Error("fb_comments.csv tidak ditemukan di /public/data/ atau /data/");
  _commentsCache = parseCSV<Comment>(p);
  return _commentsCache;
}

// ── 2. Hasil pre-computed (hasil_sentimen_fb.csv) ─────────────────────────
export function loadPrecomputed(): PrecomputedRow[] {
  if (_precomputedCache) return _precomputedCache;
  const p = resolveDataPath("hasil_sentimen_fb.csv");
  if (!p)
    throw new Error(
      "hasil_sentimen_fb.csv tidak ditemukan. " +
        "Jalankan sentimen_analisis.py terlebih dahulu, " +
        "kemudian salin outputnya ke dashboard/public/data/"
    );
  _precomputedCache = parseCSV<PrecomputedRow>(p);
  return _precomputedCache;
}
