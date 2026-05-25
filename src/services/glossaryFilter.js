/**
 * glossaryFilter.js — Mesin Filter Istilah
 *
 * Dua fungsi yang bekerja berpasangan:
 *
 *   applyArabicGlossary(arabicText)
 *     → Ganti frasa Arab dari glossary dengan token __SALAF_0__, dst.
 *       Entri diurutkan dari TERPANJANG ke TERPENDEK agar frasa yang
 *       lebih spesifik diproses lebih dulu, sehingga frasa pendek yang
 *       terkandung di dalam kalimat panjang tetap terdeteksi dengan benar.
 *       Mengembalikan { processedText, placeholderMap }
 *
 *   restorePlaceholders(translatedText, placeholderMap)
 *     → Ganti token kembali ke terjemahan istilah yang benar.
 */

import { ARABIC_GLOSSARY } from './glossary.js';

export function applyArabicGlossary(arabicText) {
  let processedText = arabicText;
  const placeholderMap = {};
  let tokenIndex = 0;

  // Urutkan dari frasa terpanjang ke terpendek.
  // Tujuannya: frasa panjang dicocokkan lebih dulu sebelum sub-frasanya
  // diganti token, sehingga tidak ada yang terlewat.
  const sortedEntries = Object.entries(ARABIC_GLOSSARY)
    .sort((a, b) => b[0].length - a[0].length);

  sortedEntries.forEach(([arabicPhrase, correctTranslation]) => {
    if (processedText.includes(arabicPhrase)) {
      const token = `__SALAF_${tokenIndex}__`;
      processedText = processedText.split(arabicPhrase).join(token);
      placeholderMap[token] = correctTranslation;
      tokenIndex++;
    }
  });

  return { processedText, placeholderMap };
}

export function restorePlaceholders(translatedText, placeholderMap) {
  let result = translatedText;
  for (const [token, correctTranslation] of Object.entries(placeholderMap)) {
    result = result.split(token).join(correctTranslation);
  }
  return result;
}
