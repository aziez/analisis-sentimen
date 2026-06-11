/**
 * lib/uploadStore.ts
 * In-memory store for uploaded CSV datasets (single-process, local dev).
 */

export interface ColumnMapping {
  text: string;         // required: column containing the text to analyze
  author?: string;      // optional: author/source name column
  timestamp?: string;   // optional: date/time column
  reactions?: string;   // optional: engagement count column
  replies?: string;     // optional: reply count column
  precomputed?: string; // optional: pre-computed sentiment label column (IndoBERTweet merge)
  confidence?: string;  // optional: pre-computed confidence score column (0–100)
}

export interface UploadedDataset {
  id: string;
  name: string;
  rawRows: Record<string, string>[];
  columns: string[];
  mapping: ColumnMapping | null;
  uploadedAt: number;
}

const store = new Map<string, UploadedDataset>();

export function saveDataset(dataset: UploadedDataset): void {
  store.set(dataset.id, dataset);
  // Keep at most 10 datasets
  if (store.size > 10) {
    const oldest = Array.from(store.entries()).sort(([, a], [, b]) => a.uploadedAt - b.uploadedAt)[0];
    if (oldest) store.delete(oldest[0]);
  }
}

export function getDataset(id: string): UploadedDataset | null {
  return store.get(id) ?? null;
}

export function updateMapping(id: string, mapping: ColumnMapping): boolean {
  const ds = store.get(id);
  if (!ds) return false;
  store.set(id, { ...ds, mapping });
  return true;
}
