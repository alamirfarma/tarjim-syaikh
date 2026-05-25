/**
 * api/translate.js — Vercel Serverless Function
 *
 * Proxy server-side ke Google Translate.
 * Karena request dilakukan dari server (bukan browser),
 * tidak ada CORS issue sama sekali.
 *
 * Endpoint: GET /api/translate?q=...
 */

export default async function handler(req, res) {
  // Allow CORS dari frontend Vercel kita sendiri
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ error: 'Parameter q wajib diisi' });
  }

  try {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'ar',
      tl: 'id',
      dt: 't',
      q: q.trim(),
    });

    const googleUrl = `https://translate.googleapis.com/translate_a/single?${params.toString()}`;

    const response = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SubtitleKajian/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Translate error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new Error('Format respons Google Translate tidak valid');
    }

    const translated = data[0]
      .filter((chunk) => Array.isArray(chunk) && chunk[0])
      .map((chunk) => chunk[0])
      .join('')
      .trim();

    return res.status(200).json({ result: translated });
  } catch (err) {
    console.error('[translate proxy error]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
