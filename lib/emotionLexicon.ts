/**
 * lib/emotionLexicon.ts
 * Indonesian 8-emotion lexicon (NRC-inspired).
 * Client-safe — no Node.js dependencies.
 */

export type EmotionKey =
  | "senang" | "marah" | "takut" | "sedih"
  | "terkejut" | "jijik" | "percaya" | "antisipasi";

export type EmotionScore = Record<EmotionKey, number>;

const LEXICON: Record<string, EmotionKey[]> = {
  // Senang / Joy
  senang:["senang"], gembira:["senang"], bahagia:["senang"], sukacita:["senang"],
  suka:["senang"], cinta:["senang","percaya"], sayang:["senang","percaya"],
  bagus:["senang","percaya"], baik:["senang","percaya"], mantap:["senang"],
  keren:["senang"], hebat:["senang","percaya"], indah:["senang"],
  lucu:["senang","terkejut"], menyenangkan:["senang"], riang:["senang"],
  bangga:["senang","percaya"], berhasil:["senang","percaya"], sukses:["senang","percaya"],
  harapan:["senang","antisipasi"], syukur:["senang","percaya"],
  // Marah / Anger
  marah:["marah"], kesal:["marah"], benci:["marah","jijik"], muak:["marah","jijik"],
  jahat:["marah","jijik"], korupsi:["marah","jijik"], bohong:["marah","jijik"],
  tipu:["marah","jijik"], curang:["marah","jijik"], buruk:["marah","sedih"],
  parah:["marah","sedih"], payah:["marah"], lambat:["marah"],
  kecewa:["marah","sedih"], gagal:["marah","sedih"],
  // Takut / Fear
  takut:["takut"], khawatir:["takut","antisipasi"], cemas:["takut","antisipasi"],
  waswas:["takut"], teror:["takut"], bahaya:["takut","antisipasi"],
  ancaman:["takut"], risiko:["takut","antisipasi"], bencana:["takut","sedih"],
  // Sedih / Sadness
  sedih:["sedih"], menangis:["sedih"], hancur:["sedih"], menderita:["sedih"],
  susah:["sedih"], duka:["sedih"], kehilangan:["sedih"], putusasa:["sedih"],
  derita:["sedih"], sakit:["sedih"], nestapa:["sedih"],
  // Terkejut / Surprise
  kaget:["terkejut"], terkejut:["terkejut"], heran:["terkejut"],
  aneh:["terkejut"], mengejutkan:["terkejut"], mendadak:["terkejut"],
  tibatiba:["terkejut"],
  // Jijik / Disgust
  jijik:["jijik"], kotor:["jijik"], busuk:["jijik"], menjijikkan:["jijik"],
  hina:["jijik","marah"], sampah:["jijik"], jorok:["jijik"],
  // Percaya / Trust
  percaya:["percaya"], amanah:["percaya"], jujur:["percaya"],
  profesional:["percaya"], andal:["percaya"], tepat:["percaya"],
  benar:["percaya"], terpercaya:["percaya"], bersih:["percaya","senang"],
  adil:["percaya"],
  // Antisipasi / Anticipation
  berharap:["antisipasi","senang"], menunggu:["antisipasi"],
  rencana:["antisipasi"], siap:["antisipasi","percaya"],
  segera:["antisipasi"], nanti:["antisipasi"], rencananya:["antisipasi"],
};

const EMPTY: EmotionScore = {
  senang:0, marah:0, takut:0, sedih:0, terkejut:0, jijik:0, percaya:0, antisipasi:0,
};

export function classifyEmotions(text: string): EmotionScore {
  const score = { ...EMPTY };
  for (const word of text.toLowerCase().split(/\s+/)) {
    const emotions = LEXICON[word];
    if (emotions) emotions.forEach((e) => { score[e]++; });
  }
  return score;
}

export function aggregateEmotions(texts: string[]): EmotionScore {
  const total = { ...EMPTY };
  for (const t of texts) {
    const s = classifyEmotions(t);
    (Object.keys(total) as EmotionKey[]).forEach((k) => { total[k] += s[k]; });
  }
  return total;
}

export const EMOTION_LABELS: Record<EmotionKey, string> = {
  senang:      "Senang / Gembira",
  marah:       "Marah / Kesal",
  takut:       "Takut / Cemas",
  sedih:       "Sedih / Kecewa",
  terkejut:    "Terkejut / Heran",
  jijik:       "Jijik / Muak",
  percaya:     "Percaya / Positif",
  antisipasi:  "Antisipasi / Harap",
};

export const EMOTION_COLORS: Record<EmotionKey, string> = {
  senang:      "#22c55e",
  marah:       "#ef4444",
  takut:       "#a855f7",
  sedih:       "#3b82f6",
  terkejut:    "#eab308",
  jijik:       "#f97316",
  percaya:     "#06b6d4",
  antisipasi:  "#84cc16",
};
