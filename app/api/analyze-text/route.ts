import { NextRequest, NextResponse } from "next/server";
import { analyzeSentiment } from "@/lib/sentimentEngine";
import type { Comment } from "@/lib/csvLoader";

export const maxDuration = 300;

const ALLOWED = ["indonesia_lexicon", "rule_based_id", "mbert_js"];

export async function POST(req: NextRequest) {
  try {
    const { text, model = "rule_based_id" } = await req.json() as { text: string; model?: string };

    if (!text?.trim()) {
      return NextResponse.json({ error: "Teks tidak boleh kosong" }, { status: 400 });
    }

    if (!ALLOWED.includes(model)) {
      return NextResponse.json({
        error: model === "indobertweet"
          ? "IndoBERTweet memerlukan file CSV hasil Python. Pilih model lain untuk analisis teks langsung."
          : `Model "${model}" tidak didukung untuk analisis teks langsung.`,
      }, { status: 400 });
    }

    const comment: Comment = {
      id: "1",
      text: text.trim(),
      author_name: "User Input",
      author_id: "",
      timestamp: new Date().toISOString().split("T")[0],
      reaction_count: "0",
      reply_count: "0",
    };

    const results = await analyzeSentiment([comment], model);
    if (!results || results.length === 0) {
      return NextResponse.json({ error: "Analisis tidak menghasilkan output" }, { status: 500 });
    }
    const r = results[0];

    const cleanText = r.Teks_Bersih ?? r.text ?? "";
    const tokens    = cleanText.split(/\s+/).filter(Boolean);

    return NextResponse.json({
      label:            r.label,
      score:            r.score,
      cleanText,
      tokens,
      model,
      modelDescription: MODEL_DESCRIPTIONS[model] ?? model,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Analisis gagal";
    console.error("[/api/analyze-text]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const MODEL_DESCRIPTIONS: Record<string, string> = {
  rule_based_id:     "Rule-Based ID — InSet Lexicon + Negasi + Intensifier",
  indonesia_lexicon: "InSet Lexicon — Kamus Sentimen Bahasa Indonesia",
  mbert_js:          "mBERT JS — BERT Multilingual via @xenova/transformers (ONNX)",
};
