import { NextRequest, NextResponse } from "next/server";
import { getDataset, updateMapping, ColumnMapping } from "@/lib/uploadStore";
import { analyzeSentiment, computeAggregates, SentimentResult, SentimentLabel } from "@/lib/sentimentEngine";
import type { Comment } from "@/lib/csvLoader";

export const maxDuration = 300;

const cache = new Map<string, { results: SentimentResult[]; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000;

const ALLOWED = ["indonesia_lexicon", "rule_based_id", "mbert_js", "indobertweet"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { datasetId: string; mapping: ColumnMapping; model?: string };
    const { datasetId, mapping, model = "rule_based_id" } = body;

    if (!datasetId || !mapping?.text)
      return NextResponse.json({ error: "Missing datasetId or mapping.text" }, { status: 400 });

    if (!ALLOWED.includes(model))
      return NextResponse.json({ error: `Model "${model}" not supported for uploaded data` }, { status: 400 });

    const dataset = getDataset(datasetId);
    if (!dataset)
      return NextResponse.json({ error: "Dataset not found — please upload again" }, { status: 404 });

    updateMapping(datasetId, mapping);

    const cacheKey = `${datasetId}_${model}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
      return NextResponse.json({
        model, isCached: true,
        aggregates: computeAggregates(hit.results),
        totalComments: hit.results.length,
        comments: hit.results,
        modelDescription: describeModel(model),
      });
    }

    // Build Comment array from mapped columns
    const comments: Comment[] = dataset.rawRows
      .map((row, i) => ({
        id: String(i),
        text: row[mapping.text] ?? "",
        author_name: mapping.author ? (row[mapping.author] ?? "Unknown") : "Unknown",
        author_id: "",
        timestamp: mapping.timestamp ? (row[mapping.timestamp] ?? "") : "",
        reaction_count: mapping.reactions ? (row[mapping.reactions] ?? "0") : "0",
        reply_count:    mapping.replies   ? (row[mapping.replies]   ?? "0") : "0",
      }))
      .filter((c) => c.text.trim().length > 0);

    let results: SentimentResult[];

    // IndoBERTweet for uploaded data: only if precomputed column is mapped
    if (model === "indobertweet") {
      if (!mapping.precomputed) {
        return NextResponse.json({
          error: "IndoBERTweet requires a pre-computed label column. Upload the hasil_sentimen CSV or choose another model.",
        }, { status: 400 });
      }
      results = dataset.rawRows
        .filter((row) => (row[mapping.text] ?? "").trim().length > 0)
        .map((row) => ({
          author_name:    mapping.author    ? (row[mapping.author]    ?? "Unknown") : "Unknown",
          text:           row[mapping.text] ?? "",
          Teks_Bersih:    row["Teks_Bersih"] ?? row[mapping.text] ?? "",
          timestamp:      mapping.timestamp ? (row[mapping.timestamp] ?? "") : "",
          reaction_count: mapping.reactions ? (row[mapping.reactions] ?? "0") : "0",
          reply_count:    mapping.replies   ? (row[mapping.replies]   ?? "0") : "0",
          label:          normalizeLabel(row[mapping.precomputed!] ?? "Netral"),
          score:          mapping.confidence
            ? (parseFloat(row[mapping.confidence] ?? "0") / 100)
            : 0,
        }));
    } else {
      results = await analyzeSentiment(comments, model);
    }

    cache.set(cacheKey, { results, ts: Date.now() });

    return NextResponse.json({
      model, isCached: false,
      aggregates: computeAggregates(results),
      totalComments: results.length,
      comments: results,
      modelDescription: describeModel(model),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    console.error("[/api/analyze]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function normalizeLabel(raw: string): SentimentLabel {
  const s = raw.trim();
  if (["Positif","Positive","positive","pos","POS"].includes(s)) return "Positif";
  if (["Negatif","Negative","negative","neg","NEG"].includes(s)) return "Negatif";
  return "Netral";
}

function describeModel(model: string): string {
  return ({
    indobertweet:      "IndoBERTweet (pre-computed results)",
    mbert_js:          "mBERT via @xenova/transformers — Transformer Multilingual",
    indonesia_lexicon: "InSet Lexicon — Kamus Bahasa Indonesia",
    rule_based_id:     "Rule-Based ID — InSet + Negasi + Intensifier",
  } as Record<string, string>)[model] ?? model;
}
