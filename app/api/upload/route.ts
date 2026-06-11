import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { randomUUID } from "crypto";
import { saveDataset } from "@/lib/uploadStore";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".csv"))
      return NextResponse.json({ error: "File must be a .csv" }, { status: 400 });
    if (file.size > 15 * 1024 * 1024)
      return NextResponse.json({ error: "File too large (max 15 MB)" }, { status: 400 });

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (!parsed.data.length)
      return NextResponse.json({ error: "CSV is empty or could not be parsed" }, { status: 400 });

    const columns = parsed.meta.fields ?? [];
    const id = randomUUID();

    saveDataset({
      id,
      name: file.name.replace(/\.csv$/i, ""),
      rawRows: parsed.data,
      columns,
      mapping: null,
      uploadedAt: Date.now(),
    });

    return NextResponse.json({
      id,
      name: file.name,
      columns,
      rowCount: parsed.data.length,
      preview: parsed.data.slice(0, 5),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
