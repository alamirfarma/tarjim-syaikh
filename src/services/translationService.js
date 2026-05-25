/**
 * translationService.js
 *
 * Menerjemahkan teks Arab ke Indonesia melalui Vercel API Route (/api/translate),
 * dengan filter glossary istilah salaf.
 *
 * Alur:
 *   1. applyArabicGlossary   → lindungi istilah Arab dengan token
 *   2. fetch /api/translate  → terjemahkan via Google Translate
 *   3. restorePlaceholders   → kembalikan token ke istilah yang benar
 */

import { applyArabicGlossary, restorePlaceholders } from './glossaryFilter.js';

export async function translateArabicToIndonesian(text) {
  if (!text || text.trim().length === 0) return '';

  // Tahap 1: Lindungi istilah Arab dari Google Translate
  const { processedText, placeholderMap } = applyArabicGlossary(text.trim());

  // Tahap 2: Kirim ke Google Translate via proxy
  const params = new URLSearchParams({ q: processedText });
  const res = await fetch(`/api/translate?${params.toString()}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.result) throw new Error('Respons terjemahan kosong');

  // Tahap 3: Kembalikan token ke terjemahan istilah yang benar
  return restorePlaceholders(data.result, placeholderMap);
}
