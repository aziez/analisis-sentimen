/**
 * lib/xenovaLoader.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Singleton loader untuk @xenova/transformers.
 *
 * Model: Xenova/bert-base-multilingual-uncased-sentiment
 *   → Versi ONNX dari "nlptown/bert-base-multilingual-uncased-sentiment"
 *   → Dilatih dengan 6 bahasa (EN, DE, FR, NL, IT, ES) + support bahasa lain
 *   → Output: "1 star" – "5 stars" (1-2=Negatif, 3=Netral, 4-5=Positif)
 *   → Ukuran model: ~681MB (ONNX quantized ~170MB)
 *   → Download otomatis ke .cache/transformers/ (sekali saja)
 *
 * PENTING: Ini adalah model berbeda dari IndoBERTweet Python.
 *   • Python → IndoBERTweet (fine-tuned khusus Twitter Indonesia)
 *   • JS     → mBERT (multilingual, generik, tidak Twitter-specific)
 *   Perbedaan hasil = temuan ilmiah yang valid untuk perbandingan.
 */

import { join } from "path";

// Singleton — dibuat sekali per proses Node.js, tetap ada selama server hidup
let pipelineInstance: any = null;
let isLoading = false;
let loadError: Error | null = null;

export async function getMBERTPipeline(): Promise<any> {
  if (loadError) throw loadError;
  if (pipelineInstance) return pipelineInstance;

  // Cegah concurrent loading (hanya satu proses load)
  if (isLoading) {
    // Tunggu hingga loading selesai
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (loadError) { clearInterval(check); reject(loadError); }
        if (pipelineInstance) { clearInterval(check); resolve(pipelineInstance); }
      }, 200);
    });
  }

  isLoading = true;
  console.log("[xenovaLoader] Memuat model mBERT dari @xenova/transformers...");
  console.log("[xenovaLoader] Model akan di-download ke .cache/transformers/ jika belum ada (~170MB)");

  try {
    const { pipeline, env } = await import("@xenova/transformers");

    // Simpan model cache di dalam project (bukan temp dir OS)
    env.cacheDir = join(process.cwd(), ".cache", "transformers");

    // Matikan progress logging yang berisik di console
    env.backends.onnx.wasm.numThreads = 1;

    pipelineInstance = await pipeline(
      "sentiment-analysis",
      "Xenova/bert-base-multilingual-uncased-sentiment",
      {
        // Gunakan quantized model yang lebih kecil (~170MB)
        quantized: true,
      }
    );

    console.log("[xenovaLoader] ✅ Model mBERT berhasil dimuat!");
    isLoading = false;
    return pipelineInstance;
  } catch (err: any) {
    loadError = err;
    isLoading = false;
    console.error("[xenovaLoader] ❌ Gagal memuat model:", err.message);
    throw err;
  }
}

/**
 * Reset singleton (untuk testing atau jika model error)
 */
export function resetMBERTPipeline(): void {
  pipelineInstance = null;
  isLoading = false;
  loadError = null;
}
