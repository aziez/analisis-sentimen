/**
 * app/api/sentiment/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/sentiment?model=indobertweet|mbert_js|indonesia_lexicon|rule_based_id|vader|textblob[&export=csv]
 *
 * Model yang tersedia:
 *   • indobertweet      (default) — hasil pre-computed dari sentimen_analisis.py
 *   • mbert_js                    — @xenova/transformers (JS-native Transformer)
 *   • indonesia_lexicon           — InSet Lexicon (Bahasa Indonesia)
 *   • rule_based_id               — Rule-Based Indonesian (negasi + intensifier)
 *   • vader                       — VADER lexicon (English, untuk perbandingan)
 *   • textblob                    — AFINN-based (English, untuk perbandingan)
 *
 * CATATAN mbert_js:
 *   Pertama kali akan lambat (~2-10 menit) karena menjalankan Transformer inference.
 *   Hasil disimpan ke disk cache (public/data/cache_mbert_js.json) agar request
 *   berikutnya instan.
 */

// Izinkan request berjalan hingga 5 menit (untuk mbert_js inference)
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { loadComments } from "@/lib/csvLoader";
import { analyzeSentiment, computeAggregates, SentimentResult } from "@/lib/sentimentEngine";
import { loadJsCache, saveJsCache, hasCachedResults } from "@/lib/jsModelCache";

const ALLOWED_MODELS = ["indobertweet", "mbert_js", "indonesia_lexicon", "rule_based_id", "vader", "textblob"];

// Models yang menggunakan JS disk cache (inference lambat)
const JS_CACHED_MODELS = new Set(["mbert_js"]);

// In-process cache (10 menit)
const cache = new Map<string, { results: SentimentResult[]; ts: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const model = (searchParams.get("model") ?? "indobertweet").toLowerCase();
  const exportCsv = searchParams.get("export") === "csv";

  if (!ALLOWED_MODELS.includes(model)) {
    return NextResponse.json(
      { error: `Model "${model}" tidak dikenal. Gunakan: indobertweet, indonesia_lexicon, rule_based_id, vader, textblob` },
      { status: 400 }
    );
  }

  try {
    const comments = loadComments();

    let results: SentimentResult[];

    // ── JS Transformer models: cek disk cache dahulu ──────────────────────
    if (JS_CACHED_MODELS.has(model)) {
      const diskCached = loadJsCache(model);
      if (diskCached) {
        const aggregates = computeAggregates(diskCached);
        return NextResponse.json(
          {
            model,
            modelDescription: getModelDescription(model),
            isCached: true,
            aggregates,
            totalComments: diskCached.length,
            comments: diskCached,
          },
          { status: 200, headers: { "Cache-Control": "no-store" } }
        );
      }
      // Cache miss — jalankan inference (bisa lambat)
      console.log(`[/api/sentiment] Mulai inference ${model} untuk ${comments.length} komentar...`);
      const startTime = Date.now();
      results = await analyzeSentiment(comments, model);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[/api/sentiment] Selesai ${model} dalam ${elapsed}s. Menyimpan ke disk cache...`);
      saveJsCache(model, results);
    } else {
      // ── Model cepat: gunakan in-memory cache ───────────────────────────
      const cached = cache.get(model);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        results = cached.results;
      } else {
        results = await analyzeSentiment(comments, model);
        cache.set(model, { results, ts: Date.now() });
      }
    }

    // ── CSV Export ───────────────────────────────────────────────────────────
    if (exportCsv) {
      const header = "author_name,text,Teks_Bersih,timestamp,reaction_count,reply_count,label,score";
      const rows = results.map((r) =>
        [
          `"${(r.author_name ?? "").replace(/"/g, '""')}"`,
          `"${(r.text ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
          `"${(r.Teks_Bersih ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
          r.timestamp,
          r.reaction_count,
          r.reply_count,
          r.label,
          r.score,
        ].join(",")
      );
      const csv = [header, ...rows].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sentiment_${model}.csv"`,
        },
      });
    }

    // ── JSON Response ─────────────────────────────────────────────────
    const aggregates = computeAggregates(results);

    return NextResponse.json(
      {
        model,
        modelDescription: getModelDescription(model),
        isCached: hasCachedResults(model),
        aggregates,
        totalComments: results.length,
        comments: results,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": JS_CACHED_MODELS.has(model)
            ? "no-store"
            : "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (err: any) {
    console.error("[/api/sentiment] Error:", err);
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 });
  }
}

// ── Helper ─────────────────────────────────────────────────────────────────────────
function getModelDescription(model: string): string {
  const modelInfo: Record<string, string> = {
    indobertweet:
      "IndoBERTweet + nusantara-nlp preprocessing (sama dengan sentimen_analisis.py) ✅ Akurat untuk Bahasa Indonesia",
    mbert_js:
      "mBERT (bert-base-multilingual) via @xenova/transformers + nusantara-nlp preprocessing — JS-native Transformer, preprocessing sama dengan Python 🔬",
    indonesia_lexicon:
      "InSet Lexicon (Bahasa Indonesia) — mendukung slang, emoji, bahasa Jawa",
    rule_based_id:
      "Rule-Based Indonesian — InSet + penanganan negasi & intensifier",
    vader:
      "VADER Lexicon (English) — untuk perbandingan, tidak akurat untuk Bahasa Indonesia",
    textblob:
      "AFINN-based / TextBlob equivalent (English) — untuk perbandingan",
  };
  return modelInfo[model] ?? model;
}
