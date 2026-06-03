/**
 * lib/jsModelCache.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Disk cache untuk hasil model JS (@xenova/transformers).
 *
 * Mengapa perlu cache?
 *   • Model Transformer di Node.js butuh 2-10 menit untuk 1000+ komentar
 *   • Cache menyimpan hasil ke JSON → request ke-2 instan (<100ms)
 *   • Cache tersimpan di: public/data/cache_{modelId}.json
 *
 * Cache dianggap valid selama file fb_comments.csv tidak berubah
 * (dibandingkan berdasarkan ukuran file / mtime).
 */

import { readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import type { SentimentResult } from "./sentimentEngine";

const DATA_DIR = join(process.cwd(), "public", "data");
const SOURCE_CSV = join(DATA_DIR, "fb_comments.csv");

interface CacheFile {
  /** Timestamp penulisan cache (ms) */
  createdAt: number;
  /** Ukuran file sumber saat cache dibuat (bytes) — untuk deteksi perubahan data */
  sourceSizeBytes: number;
  /** Waktu modifikasi terakhir file sumber */
  sourceMtimeMs: number;
  results: SentimentResult[];
}

function cachePath(modelId: string): string {
  return join(DATA_DIR, `cache_${modelId}.json`);
}

function getSourceStat(): { size: number; mtimeMs: number } | null {
  try {
    const stat = statSync(SOURCE_CSV);
    return { size: stat.size, mtimeMs: stat.mtimeMs };
  } catch {
    return null;
  }
}

/**
 * Coba baca cache dari disk.
 * Mengembalikan null jika:
 *   - file tidak ada
 *   - file sumber (fb_comments.csv) telah berubah sejak cache dibuat
 *   - JSON rusak
 */
export function loadJsCache(modelId: string): SentimentResult[] | null {
  const path = cachePath(modelId);
  if (!existsSync(path)) return null;

  try {
    const raw: CacheFile = JSON.parse(readFileSync(path, "utf-8"));
    const srcStat = getSourceStat();

    if (srcStat) {
      // Invalidate cache jika data sumber berubah
      if (raw.sourceSizeBytes !== srcStat.size || raw.sourceMtimeMs !== srcStat.mtimeMs) {
        console.log(`[jsModelCache] Cache ${modelId} outdated — data sumber berubah. Hitung ulang.`);
        return null;
      }
    }

    console.log(`[jsModelCache] ✅ Cache ${modelId} valid (${raw.results.length} komentar, dibuat ${new Date(raw.createdAt).toLocaleString("id-ID")})`);
    return raw.results;
  } catch {
    return null;
  }
}

/**
 * Simpan hasil ke disk cache.
 */
export function saveJsCache(modelId: string, results: SentimentResult[]): void {
  const srcStat = getSourceStat();
  const cacheFile: CacheFile = {
    createdAt: Date.now(),
    sourceSizeBytes: srcStat?.size ?? 0,
    sourceMtimeMs: srcStat?.mtimeMs ?? 0,
    results,
  };

  try {
    writeFileSync(cachePath(modelId), JSON.stringify(cacheFile), "utf-8");
    console.log(`[jsModelCache] 💾 Cache ${modelId} disimpan (${results.length} komentar)`);
  } catch (err: any) {
    console.warn(`[jsModelCache] ⚠️ Gagal menyimpan cache: ${err.message}`);
  }
}

/**
 * Hapus cache untuk model tertentu (untuk force recompute).
 */
export function clearJsCache(modelId: string): void {
  const path = cachePath(modelId);
  if (existsSync(path)) {
    const { unlinkSync } = require("fs");
    unlinkSync(path);
    console.log(`[jsModelCache] 🗑️ Cache ${modelId} dihapus`);
  }
}

/**
 * Cek apakah cache tersedia (tanpa membacanya).
 */
export function hasCachedResults(modelId: string): boolean {
  return existsSync(cachePath(modelId));
}
