# SubtitleKajian — Live Arabic Subtitle App

Aplikasi subtitle live kajian bahasa Arab ke Indonesia.  
Gratis 100%, tanpa API berbayar.

---

## Cara Menjalankan

### Prasyarat
- Node.js v18 atau lebih baru
- Google Chrome (desktop) — wajib untuk Web Speech API

### Install & Run

```bash
# 1. Masuk ke folder project
cd subtitle-kajian

# 2. Install dependencies
npm install

# 3. Jalankan development server
npm run dev

# 4. Buka browser Chrome di:
#    http://localhost:5173
```

### Build untuk Production

```bash
npm run build
npm run preview
```

---

## Cara Pakai

1. Buka aplikasi di Chrome
2. Klik **Mulai** — browser akan minta izin mikrofon, klik **Allow**
3. Arahkan mikrofon ke syaikh yang sedang berceramah
4. Teks Arab dan terjemahan Indonesia muncul otomatis
5. Klik **Selesai** untuk melihat Catatan Kajian lengkap

---

## Arsitektur

```
src/
├── App.jsx                       # Komponen utama + state management
├── main.jsx                      # Entry point React
├── index.css                     # Stylesheet global
├── hooks/
│   ├── useSpeechRecognition.js   # Web Speech API wrapper
│   └── useTranscriptManager.js   # Manajemen riwayat transkrip
└── services/
    └── translationService.js     # Free Google Translate client
```

### Flow Aplikasi

```
Microphone → Web Speech API (ar-SA)
          → isArabicText() filter
          → translateArabicToIndonesian()
          → Update UI (currentArabic, currentIndonesian)
          → addEntry() → background storage
```

### Filtering Bahasa Indonesia
Fungsi `isArabicText()` menghitung proporsi kata yang mengandung karakter
Unicode Arab (U+0600–U+06FF dan range terkait). Jika kurang dari 50%,
teks diabaikan sepenuhnya — tidak ditampilkan, tidak diterjemahkan.

### Terjemahan Gratis
Menggunakan endpoint `translate.googleapis.com/translate_a/single`
dengan parameter `client=gtx` — ini endpoint publik yang sama digunakan
oleh Google Translate web, tanpa API key dan tanpa biaya.

---

## Keterbatasan & Saran Improvement

| Isu | Saran Versi Berikutnya |
|-----|------------------------|
| Web Speech API hanya Chrome | Tambah fallback Whisper.cpp (offline) |
| Endpoint `gtx` informal | Gunakan LibreTranslate self-hosted untuk stabilitas |
| Tidak ada export | Tambah export ke .txt / .pdf |
| Tidak ada zoom font | Tambah slider ukuran teks untuk proyektor |
| Tidak ada offline mode | Service Worker + cache |
| Satu bahasa tujuan | Multi-bahasa (Inggris, Malaysia) |

---

## Browser Support

| Browser | Status |
|---------|--------|
| Chrome Desktop | ✅ Didukung penuh |
| Edge (Chromium) | ⚠ Mungkin berfungsi |
| Firefox | ❌ Tidak didukung (tidak ada Web Speech API) |
| Safari | ❌ Tidak didukung (Web Speech API terbatas) |
| Mobile Chrome | ⚠ Mikrofon terbatas, tidak direkomendasikan |

---

## Lisensi

MIT — bebas digunakan untuk keperluan dakwah dan pendidikan.
