/**
 * lib/indonesianLexicon.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Lexicon-based sentiment untuk Bahasa Indonesia.
 * Preprocessing menggunakan library nusantara-nlp (npm).
 *
 * Pipeline:
 *   raw text
 *     → extractEmojiScore     (sebelum dibersihkan)
 *     → applySlangMap         (ga→tidak, bgt→banget, gak→tidak, dll.)
 *     → NusantaraNLP.process()→ tokensClean (stopword removed) + tokensStem
 *     → scoreTokens           (cek lexicon di tokensClean DAN tokensStem)
 *
 * MODEL 1 — scoreWithInSet():
 *   Murni lookup lexicon + emoji. Tanpa negasi/intensifier.
 *
 * MODEL 2 — scoreWithRuleBased():
 *   InSet + penanganan negasi (tidak/bukan/gak/ora) dan
 *   intensifier (sangat/banget/sekali) dengan multiplier.
 *
 * Referensi lexicon:
 *   InSet (Indonesian Sentiment Lexicon) — Fachrina et al. (2017)
 *   Diperluas dengan kosakata komentar media sosial Indonesia.
 */

// ──────────────────────────────────────────────────────────────────────────────
// 0. TYPE DECLARATION untuk nusantara-nlp (tidak ada @types)
// ──────────────────────────────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
let _nlpInstance: any = null;

function getNLPInstance(): any {
  if (_nlpInstance) return _nlpInstance;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { NusantaraNLP } = require("nusantara-nlp");
  _nlpInstance = new NusantaraNLP();
  return _nlpInstance;
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. CUSTOM SLANG MAP — diterapkan sebelum NusantaraNLP
//    Mencakup singkatan, bahasa gaul, dan bahasa Jawa yang sering di komentar FB
// ──────────────────────────────────────────────────────────────────────────────
const SLANG_MAP: Record<string, string> = {
  // ─ Negasi ─
  gak: "tidak", ga: "tidak", g: "tidak", ngga: "tidak", nggak: "tidak",
  gk: "tidak", ngak: "tidak", ndak: "tidak", ngk: "tidak", tdk: "tidak",
  bkn: "bukan", bukn: "bukan", tak: "tidak",
  // Jawa
  ora: "tidak", dudu: "bukan", ra: "tidak",
  // ─ Intensifier ─
  bgt: "banget", bngt: "banget", bnget: "banget", bgtt: "banget",
  sgt: "sangat", skli: "sekali",
  // ─ Kata ganti ─
  gw: "saya", gue: "saya", ane: "saya", aq: "saya", akw: "saya", w: "saya",
  lo: "kamu", lu: "kamu", elo: "kamu", loe: "kamu",
  mrk: "mereka",
  // ─ Singkatan umum ─
  yg: "yang", dgn: "dengan", dg: "dengan", dr: "dari", utk: "untuk",
  jd: "jadi", jdi: "jadi",
  udh: "sudah", udah: "sudah", dah: "sudah", sdh: "sudah",
  blm: "belum", blum: "belum",
  lg: "lagi", lgi: "lagi",
  krn: "karena", karna: "karena", krna: "karena",
  tp: "tapi", tpi: "tapi",
  bs: "bisa",
  msh: "masih",
  pdhl: "padahal", pdhal: "padahal",
  byk: "banyak", bnyk: "banyak",
  sbnrnya: "sebenarnya", sbnr: "sebenarnya",
  gmn: "bagaimana", gimana: "bagaimana",
  klo: "kalau", kl: "kalau",
  aj: "saja", aja: "saja", z: "saja", bae: "saja",
  sj: "saja",
  hrs: "harus",
  mo: "mau",
  yo: "ya", yha: "ya",
  ni: "ini", nih: "ini",
  tuh: "itu",
  sdg: "sedang", lgi2: "lagi",
  biyen: "dulu", sakiki: "sekarang", skg: "sekarang", sekrng: "sekarang",
  // ─ Persetujuan/Sentimen pendek ─
  ok: "oke",
  sip: "bagus", siip: "bagus",
  mantep: "mantap",
  keren: "keren",
  jelek: "jelek", jlek: "jelek",
  // ─ Emosi / Slang ─
  asik: "asyik",
  asli: "benar", emg: "memang", emang: "memang",
  // ─ Jawa / daerah ─
  apik: "bagus", enak: "baik",
  ngono: "begitu", ngene: "begini",
  opo: "apa", jan: "benar-benar",
  beneran: "benar", bener: "benar",
  gapapa: "tidak apa-apa", rapopo: "tidak apa-apa",
  // ─ Teknologi ─
  lemot: "lambat", lag: "lambat",
  error: "rusak", bug: "rusak", crash: "rusak",
  // ─ Platform ─
  fb: "facebook", ig: "instagram", wa: "whatsapp",
};

// ──────────────────────────────────────────────────────────────────────────────
// 2. NEGATION WORDS
// ──────────────────────────────────────────────────────────────────────────────
const NEGATIONS = new Set([
  "tidak", "bukan", "jangan", "tanpa", "tiada", "tak", "non", "anti",
  // Gaul (setelah SLANG_MAP, kata-kata ini sudah ternormalisasi ke "tidak"/"bukan"
  // tapi kita tetap taruh di sini sebagai fallback jika belum tersaring)
  "gak", "nggak", "ngga", "ga",
  // Jawa
  "ora", "dudu", "ra",
]);

// ──────────────────────────────────────────────────────────────────────────────
// 3. INTENSIFIER WORDS + MULTIPLIER
// ──────────────────────────────────────────────────────────────────────────────
const INTENSIFIERS: Record<string, number> = {
  sangat: 1.6, amat: 1.6, sungguh: 1.5,
  banget: 1.4, sekali: 1.4, bgt: 1.4,
  benar: 1.3, bener: 1.3, memang: 1.2, emang: 1.2, emg: 1.2,
  luar: 1.5,   // "luar biasa" — luar akan di-check konteks berikutnya
  super: 1.6, hyper: 1.6,
  tenan: 1.4, jan: 1.3,         // Jawa
  parah: 1.3,                   // "parah bagus" → sering dipakai sbg superlative
  // Downscaler (mengurangi intensitas)
  agak: 0.6, cukup: 0.7, lumayan: 0.7, sedikit: 0.5, kurang: 0.5,
};

// ──────────────────────────────────────────────────────────────────────────────
// 4. INSET LEXICON — diperluas dengan kosakata media sosial Indonesia
//    Nilai = bobot sentimen (1–5, semakin besar semakin kuat)
//    Mencakup: kata dasar, stem, dan bentuk turunan populer
// ──────────────────────────────────────────────────────────────────────────────

/** POSITIF */
const INSET_POS: Record<string, number> = {
  // ── Sangat Positif (5) ──
  terbaik: 5, terhebat: 5, sempurna: 5, luar_biasa: 5, memukau: 5,
  menakjubkan: 5, spektakuler: 5, brilian: 5, fenomenal: 5,
  // ── Positif Kuat (4) ──
  bagus: 4, baik: 4, keren: 4, mantap: 4, hebat: 4, memuaskan: 4,
  bangga: 4, berhasil: 4, sukses: 4, indah: 4, cantik: 4,
  setuju: 4, mendukung: 4, hormat: 4, apresiasi: 4,
  bermanfaat: 4, berguna: 4, efektif: 4, efisien: 4,
  profesional: 4, berkualitas: 4,
  // stem forms
  hasil: 4,   // hasilnya → hasil
  layan: 4,   // pelayanan → layan
  // ── Positif Sedang (3) ──
  senang: 3, gembira: 3, puas: 3, suka: 3, cinta: 3, sayang: 3,
  seru: 3, asyik: 3, asik: 3, menyenangkan: 3,
  nyaman: 3, aman: 3, sehat: 3, bersih: 3, rapi: 3, jujur: 3,
  responsif: 3, ramah: 3, sopan: 3,
  mudah: 3, cepat: 3, lancar: 3,
  positif: 3, benar: 3, tepat: 3,
  maju: 3, berkembang: 3, meningkat: 3, meningkatkan: 3,
  bantu: 3, membantu: 3, tolong: 3, terharu: 3, kagum: 3,
  semangat: 3, giat: 3, rajin: 3,
  berjalan: 3, terlaksana: 3, realisasi: 3,
  oke: 3, mantep: 3, apik: 3,
  // Komentar sosmed khas
  top: 3, gas: 3, gass: 3, hajar: 3, lanjutkan: 3, teruskan: 3,
  pertahankan: 3, kiyowo: 3, uwu: 3,
  // ── Positif Ringan (2) ──
  cukup: 2, lumayan: 2, ok: 2,
  menarik: 2, stabil: 2, konsisten: 2, teratur: 2,
  normal: 2, wajar: 2, layak: 2, pantas: 2,
  hadir: 2, tersedia: 2,
  peduli: 2, perhatian: 2, tanggap: 2, sigap: 2,
  sinergi: 2, koordinasi: 2, kolaborasi: 2,
  dukung: 2, dukungan: 2,
  // stem forms
  ubah: 2,    // berubah → ubah
  guna: 2,    // berguna → guna
  manfaat: 2, // manfaatnya → manfaat
  rasa: 2,    // merasakan → rasa (ambigu, bobot kecil)
  // ── Positif Minimal (1) ──
  baik_baik: 1, biasa_saja: 1,
};

const INSET_NEG: Record<string, number> = {
  // ── Sangat Negatif (5) ──
  terburuk: 5, brengsek: 5, bangsat: 5, keparat: 5, sialan: 5,
  bajingan: 5, terkutuk: 5, celaka: 5, laknat: 5,
  // ── Negatif Kuat (4) ──
  buruk: 4, jelek: 4, parah: 4, gagal: 4, hancur: 4, rusak: 4,
  curang: 4, tipu: 4, menipu: 4, penipuan: 4, bohong: 4,
  korupsi: 4, pungli: 4, suap: 4,
  kejam: 4, kasar: 4, zalim: 4, jahat: 4, bengis: 4,
  bodoh: 4, tolol: 4, goblok: 4, dungu: 4,
  // ── Negatif Sedang (3) ──
  kecewa: 3, marah: 3, sedih: 3, susah: 3, sulit: 3, repot: 3,
  kesal: 3, jengkel: 3, frustrasi: 3, bosan: 3, muak: 3,
  lambat: 3, lama: 3, lelet: 3, lemot: 3,
  mahal: 3, palsu: 3, spam: 3, scam: 3,
  payah: 3, lemah: 3, loyo: 3, terpuruk: 3,
  macet: 3, berhenti: 3, terhambat: 3,
  kotor: 3, kumuh: 3, jorok: 3, semrawut: 3,
  melanggar: 3, pelanggaran: 3, penyimpangan: 3,
  tidak_adil: 3, diskriminasi: 3, nepotisme: 3,
  memprihatinkan: 3,
  // Komentar sosmed khas
  anjir: 3, anjing: 3, kampret: 3,
  nyebelin: 3, nyesel: 3, kapok: 3,
  // ── Negatif Ringan-Sedang (2) ──
  kurang: 2, salah: 2, keliru: 2,
  membingungkan: 2, bingung: 2, aneh: 2, janggal: 2,
  mengecewakan: 2, bermasalah: 2, masalah: 2, gangguan: 2, terganggu: 2,
  tidak_profesional: 2, tidak_jelas: 2,
  telat: 2, terlambat: 2,
  abai: 2, abaikan: 2, acuh: 2, cuek: 2,
  ragu: 2, khawatir: 2, curiga: 2,
  pemborosan: 2, mubazir: 2,
  stagnan: 2, mandek: 2,
  // ── Negatif Ringan (1) ──
  risih: 1, tidak_nyaman: 1, tidak_senang: 1,
};

// ──────────────────────────────────────────────────────────────────────────────
// 5. EMOJI SENTIMENT MAP
// ──────────────────────────────────────────────────────────────────────────────
const EMOJI_SCORES: Record<string, number> = {
  // Sangat positif
  "😍": 4, "🥰": 4, "❤️": 3, "💕": 3, "🎉": 3, "🏆": 4, "✨": 2,
  "🌟": 3, "⭐": 2, "💫": 2,
  // Positif
  "😊": 2, "😀": 2, "😁": 2, "😄": 2, "😃": 2,
  "👍": 2, "💪": 2, "🔥": 2, "🙏": 1,
  "😎": 2, "🥳": 3, "💯": 3, "👏": 2, "😘": 2, "🤩": 3,
  "🫶": 2, "👌": 2, "✅": 2, "💚": 2,
  // Netral / Ambigu
  "🤔": 0, "😐": 0, "🙂": 0.5, "😶": 0, "😏": 0,
  // Negatif
  "😢": -2, "😭": -3, "😡": -3, "😠": -3,
  "👎": -3, "💀": -2, "🤮": -3,
  "😱": -1, "😤": -2, "🤬": -4, "😔": -1, "😞": -2,
  "😫": -2, "😩": -2, "🥲": -1,
  // Sangat negatif
  "💔": -3, "🗑️": -2, "⛔": -2, "❌": -2,
};

// ──────────────────────────────────────────────────────────────────────────────
// 6. PREPROCESSING
// ──────────────────────────────────────────────────────────────────────────────

/** Ekstrak skor emoji SEBELUM teks dibersihkan */
function extractEmojiScore(text: string): number {
  let score = 0;
  for (const [emoji, val] of Object.entries(EMOJI_SCORES)) {
    const count = text.split(emoji).length - 1;
    score += val * count;
  }
  return score;
}

/**
 * Terapkan SLANG_MAP kata per kata (single pass).
 * Hasilnya bisa berbeda dengan input jika ada slang yang dikenali.
 */
function applySlangMap(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((t) => SLANG_MAP[t] ?? t)
    .join(" ");
}

/**
 * Preprocessing dengan nusantara-nlp + custom SLANG_MAP.
 *
 * Mengembalikan:
 *   - tokensClean : tokens setelah stopword removal (negasi + intensifier TETAP ada)
 *   - tokensStem  : tokens setelah stemming (untuk lookup lexicon)
 *   - emojiScore  : skor mentah dari emoji yang ada di teks asli
 */
function preprocessID(rawText: string): {
  tokensClean: string[];
  tokensStem: string[];
  emojiScore: number;
} {
  const emojiScore = extractEmojiScore(rawText);

  // Langkah 1: lowercase + hapus URL/mention/hashtag
  let text = rawText.toLowerCase();
  text = text.replace(/https?:\/\/\S+/g, " ");
  text = text.replace(/[@#]\S+/g, " ");
  // Hapus karakter non-alfanumerik (termasuk emoji)
  text = text.replace(/[^\w\s]/gu, " ");
  text = text.replace(/\s+/g, " ").trim();

  // Langkah 2: normalisasi slang custom sebelum NusantaraNLP
  text = applySlangMap(text);

  // Langkah 3: NusantaraNLP pipeline
  const nlp = getNLPInstance();
  const processed = nlp.process(text);

  // NusantaraNLP menghapus stopword tapi JUGA menghapus kata seperti "tidak"/"tidak".
  // Kita perlu memastikan NEGASI dan INTENSIFIER tetap ada.
  // Solusi: ambil tokensClean dari library, lalu tambahkan kembali kata negasi/intensifier
  // yang mungkin terhapus dari tokens asli.
  const rawTokens: string[] = (text || "").split(/\s+/).filter(Boolean);
  const cleanedSet = new Set<string>(processed.tokensClean as string[]);
  const stemSet = new Set<string>(processed.tokensStem as string[]);

  // Rekonstruksi urutan token dengan mempertahankan negasi & intensifier
  const tokensClean: string[] = [];
  const tokensStem: string[] = [];

  for (let i = 0; i < rawTokens.length; i++) {
    const t = rawTokens[i];
    // Selalu pertahankan negasi dan intensifier
    if (NEGATIONS.has(t) || t in INTENSIFIERS) {
      tokensClean.push(t);
      tokensStem.push(t);
    } else if (cleanedSet.has(t)) {
      // Token lolos stopword removal → cari stem-nya
      const stemIdx = (processed.tokensClean as string[]).indexOf(t);
      const stem = stemIdx >= 0
        ? (processed.tokensStem as string[])[stemIdx] ?? t
        : t;
      tokensClean.push(t);
      tokensStem.push(stem);
    }
    // Token yang dihapus sebagai stopword biasa → skip
  }

  return { tokensClean, tokensStem, emojiScore };
}

// ──────────────────────────────────────────────────────────────────────────────
// 7. LEXICON SCORING HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/** Skor satu token terhadap InSet. Cek form asli dan stem. */
function tokenScore(clean: string, stem: string): number {
  // Cek form asli dulu
  if (clean in INSET_POS) return INSET_POS[clean];
  if (clean in INSET_NEG) return -INSET_NEG[clean];
  // Fallback ke stemmed form
  if (stem !== clean) {
    if (stem in INSET_POS) return INSET_POS[stem];
    if (stem in INSET_NEG) return -INSET_NEG[stem];
  }
  return 0;
}

/** Normalisasi skor total ke -1..+1. Clamp = 15 (threshold empiris). */
function normalize(total: number, tokenCount: number): number {
  // Bagi dengan akar panjang teks (mengurangi bias teks panjang)
  const denom = Math.max(1, Math.sqrt(tokenCount)) * 3;
  return Math.max(-1, Math.min(1, total / denom));
}

// ──────────────────────────────────────────────────────────────────────────────
// 8. PUBLIC PREPROCESSING EXPORT
// ──────────────────────────────────────────────────────────────────────────────

/**
 * preprocessIDText — Jalankan full preprocessing pipeline Bahasa Indonesia:
 *   1. Hapus URL, @mention, #hashtag
 *   2. Normalisasi slang (SLANG_MAP) — ga→tidak, bgt→banget, dll.
 *   3. nusantara-nlp: stopword removal + stemming (Sastrawi ECS)
 *   4. Pertahankan kata negasi & intensifier (tidak/bukan/sangat/banget)
 *
 * Hasilnya adalah teks bersih berbentuk string, siap diumpankan ke model BERT.
 * Ini adalah pipeline yang sama dengan sentimen_analisis.py (Python).
 *
 * @param rawText - teks mentah dari komentar Facebook
 * @returns teks yang sudah dipreprocess, atau string kosong jika input kosong
 */
export function preprocessIDText(rawText: string): string {
  if (!rawText || rawText.trim().length === 0) return "";
  const { tokensClean } = preprocessID(rawText);
  if (tokensClean.length === 0) return rawText.slice(0, 512); // fallback ke teks asli jika semua terhapus
  return tokensClean.join(" ");
}

// ──────────────────────────────────────────────────────────────────────────────
// 9. PUBLIC SCORING FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * scoreWithInSet — InSet lexicon + emoji.
 * Tidak mempertimbangkan negasi atau intensifier.
 * Cocok untuk analisis murni berbasis kamus.
 */
export function scoreWithInSet(text: string): number {
  const { tokensClean, tokensStem, emojiScore } = preprocessID(text);
  if (tokensClean.length === 0 && emojiScore === 0) return 0;

  let lexScore = 0;
  for (let i = 0; i < tokensClean.length; i++) {
    lexScore += tokenScore(tokensClean[i], tokensStem[i] ?? tokensClean[i]);
  }

  const total = lexScore + emojiScore;
  return normalize(total, tokensClean.length);
}

/**
 * scoreWithRuleBased — InSet + negasi + intensifier.
 *
 * Algoritma per token:
 *   1. Negasi terdeteksi → set negateNext = true
 *   2. Intensifier terdeteksi → simpan multiplier
 *   3. Kata sentimen → score × multiplier, jika negateNext balik tanda (×-0.7 / ×1.3)
 *   4. Emoji ditambahkan di akhir
 */
export function scoreWithRuleBased(text: string): number {
  const { tokensClean, tokensStem, emojiScore } = preprocessID(text);
  if (tokensClean.length === 0 && emojiScore === 0) return 0;

  let totalScore = 0;
  let negateNext = false;
  let intensityMult = 1.0;

  for (let i = 0; i < tokensClean.length; i++) {
    const t = tokensClean[i];
    const s = tokensStem[i] ?? t;

    // ── Negasi ──
    if (NEGATIONS.has(t)) {
      negateNext = true;
      intensityMult = 1.0; // reset intensifier di depan negasi
      continue;
    }

    // ── Intensifier ──
    if (t in INTENSIFIERS) {
      intensityMult = INTENSIFIERS[t];
      // Khusus "luar biasa": "luar" diikuti "biasa"
      if (t === "luar" && i + 1 < tokensClean.length && tokensClean[i + 1] === "biasa") {
        intensityMult = 2.0;
        i++; // lewati "biasa"
      }
      continue;
    }

    // ── Kata sentimen ──
    let wordScore = tokenScore(t, s);

    if (wordScore !== 0) {
      // Terapkan intensifier
      wordScore *= intensityMult;
      // Terapkan negasi (bukan kebalikan penuh — mirip VADER)
      if (negateNext) {
        wordScore = wordScore > 0
          ? -Math.abs(wordScore) * 0.74  // positif → negatif dikurangi
          : Math.abs(wordScore) * 1.3;   // negatif → lebih negatif jika dinegasi: "tidak jelek" = masih negatif tapi ringan
        // Sebenarnya "tidak jelek" = sedikit positif menurut VADER; kita ambil pendekatan conservative
        // Jika ingin lebih simpel: wordScore = -wordScore * 0.5
        negateNext = false;
      }
      totalScore += wordScore;
      intensityMult = 1.0; // reset setelah dipakai
    } else {
      // Kata netral: jika bukan intensifier, reset negasi (max jangkauan 1 kata)
      negateNext = false;
      intensityMult = 1.0;
    }
  }

  // Tambahkan skor emoji
  totalScore += emojiScore;

  return normalize(totalScore, tokensClean.length);
}
