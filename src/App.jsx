import { useState, useRef, useEffect } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useTranscriptManager } from './hooks/useTranscriptManager';
import { translateArabicToIndonesian } from './services/translationService';

function FontSlider({ label, value, onChange, min, max }) {
  return (
    <div className="font-slider-wrap">
      <div className="font-slider-label">
        <span>{label}</span>
        <span className="font-slider-value">{value}px</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-slider"
      />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    idle:        { label: 'Siap',          cls: 'status-idle' },
    listening:   { label: 'Mendengarkan',  cls: 'status-live' },
    translating: { label: 'Menerjemahkan', cls: 'status-translating' },
    error:       { label: 'Error',         cls: 'status-error' },
    done:        { label: 'Selesai',       cls: 'status-idle' },
  };
  const { label, cls } = map[status] || map.idle;
  return (
    <div className={`status-badge ${cls}`}>
      {status === 'listening' && <span className="pulse-dot" />}
      {label}
    </div>
  );
}

// Komponen kartu pasangan Arab + Terjemahan
function EntryCard({ arabic, indonesian, isLive, arabicFontSize, indonesianFontSize, index }) {
  return (
    <div className={`entry-card${isLive ? ' entry-card--live' : ''}`}>
      {isLive && <div className="live-badge"><span className="pulse-dot" /> Sedang diterjemahkan</div>}
      <p
        className="entry-arabic"
        dir="rtl"
        lang="ar"
        style={{ fontSize: arabicFontSize + 'px' }}
      >
        {arabic}
      </p>
      <div className="entry-divider" />
      {indonesian
        ? <p className="entry-indonesian" style={{ fontSize: indonesianFontSize + 'px' }}>{indonesian}</p>
        : <span className="translating-indicator">
            <span className="dots"><span /><span /><span /></span>
            Menerjemahkan…
          </span>
      }
      {!isLive && (
        <div className="entry-index">#{index}</div>
      )}
    </div>
  );
}

// Feed riwayat — terbaru di atas
function HistoryFeed({ entries, liveArabic, liveIndonesian, isTranslating, arabicFontSize, indonesianFontSize }) {
  const showLive = liveArabic && isTranslating;
  const reversed = [...entries].reverse();

  return (
    <div className="history-feed">
      {!showLive && !entries.length && (
        <div className="feed-empty">
          <span className="feed-empty-icon">🎙️</span>
          <p>Tekan <strong>Mulai</strong> lalu arahkan mikrofon ke ucapan Syaikh.</p>
          <p>Setiap kalimat yang selesai dikenali akan muncul di sini.</p>
        </div>
      )}

      {/* Kartu live — selalu paling atas saat sedang terjemahan */}
      {showLive && (
        <EntryCard
          arabic={liveArabic}
          indonesian={liveIndonesian}
          isLive={true}
          arabicFontSize={arabicFontSize}
          indonesianFontSize={indonesianFontSize}
        />
      )}

      {/* Kartu riwayat — dibalik agar terbaru di atas */}
      {reversed.map((entry, i) => (
        <EntryCard
          key={entry.id}
          arabic={entry.arabic}
          indonesian={entry.indonesian}
          isLive={false}
          arabicFontSize={arabicFontSize}
          indonesianFontSize={indonesianFontSize}
          index={entries.length - i}
        />
      ))}
    </div>
  );
}

function NotesView({ entries, onReset }) {
  const [exporting, setExporting] = useState(false);

  const handleCopy = () => {
    const text = entries.map((e, i) => `[${i + 1}] ${e.indonesian}`).join('\n\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const handleExportPDF = async () => {
    if (entries.length === 0) return;
    setExporting(true);
    try {
      await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      const jsPDF = window.jspdf.jsPDF;
      const html2canvas = window.html2canvas;

      const container = document.createElement('div');
      container.style.cssText = `
        position: fixed; left: -9999px; top: 0; width: 794px;
        background: white; font-family: 'Noto Naskh Arabic', 'Lato', sans-serif; padding: 0;
      `;

      const tanggal = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      container.innerHTML = `
        <div style="background:#0d1b2a; padding:18px 30px; display:flex; justify-content:space-between; align-items:center;">
          <span style="color:#c9a84c; font-size:22px; font-weight:bold; font-family:sans-serif;">Catatan Kajian</span>
          <span style="color:#b0a490; font-size:13px; font-family:sans-serif;">${tanggal}</span>
        </div>
        <div style="padding: 24px 30px;">
          ${entries.map((entry, i) => `
            <div style="margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid #e0e0e0;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                <span style="color:#c9a84c; font-weight:bold; font-size:13px; font-family:sans-serif; min-width:24px; flex-shrink:0;">${i + 1}.</span>
                <div style="text-align:right; font-family:'Noto Naskh Arabic',serif; font-size:18px; color:#333; direction:rtl; flex:1; margin-left:12px; word-break:break-word;">
                  ${entry.arabic}
                </div>
              </div>
              <div style="font-family:sans-serif; font-size:13px; color:#1a1a1a; line-height:1.7; margin-left:24px; word-break:break-word;">
                ${entry.indonesian}
              </div>
              <div style="text-align:right; font-size:10px; color:#aaa; font-family:sans-serif; margin-top:6px;">
                ${entry.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          `).join('')}
        </div>
        <div style="background:#0d1b2a; padding:8px 30px; display:flex; justify-content:space-between;">
          <span style="color:#506070; font-size:10px; font-family:sans-serif;">SubtitleKajian</span>
          <span style="color:#506070; font-size:10px; font-family:sans-serif;">${entries.length} kalimat</span>
        </div>
      `;

      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
      document.body.removeChild(container);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginMm = 15;
      const printW = pageW - marginMm * 2;

      // Tinggi gambar header (proporsi dari canvas)
      const headerEl = container.querySelector('div:first-child');
      const footerEl = container.querySelector('div:last-child');
      const bodyEl   = container.querySelector('div:nth-child(2)');

      // Render ulang per bagian: header, tiap entry, footer
      const sections = container.querySelectorAll('div:nth-child(2) > div');

      // Render header
      const headerCanvas = await html2canvas(container.querySelector('div:first-child') || container, {
        scale: 2, useCORS: true, backgroundColor: '#0d1b2a'
      });

      const doc2 = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = doc2.internal.pageSize.getWidth();
      const ph = doc2.internal.pageSize.getHeight();
      const mg = 15;
      const pw2 = pw - mg * 2;

      // Render seluruh container sekaligus, lalu potong dengan benar
      const fullCanvas = await html2canvas(container, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff',
        windowWidth: 794,
      });

      const fullImgH = (fullCanvas.height * pw2) / fullCanvas.width;
      const usableH  = ph - mg * 2;  // tinggi area cetak per halaman
      const totalPages = Math.ceil(fullImgH / usableH);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) doc2.addPage();
        // Geser gambar ke atas sesuai halaman, dengan margin atas
        doc2.addImage(
          fullCanvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          mg,
          mg - i * usableH,
          pw2,
          fullImgH
        );
        // Tutup area luar margin dengan kotak putih atas dan bawah
        doc2.setFillColor(255, 255, 255);
        doc2.rect(0, 0, pw, mg, 'F');                  // tutup atas
        doc2.rect(0, ph - mg, pw, mg, 'F');            // tutup bawah
        doc2.rect(0, 0, mg, ph, 'F');                  // tutup kiri
        doc2.rect(pw - mg, 0, mg, ph, 'F');            // tutup kanan
      }

      doc2.save(`catatan-kajian-${Date.now()}.pdf`);
    } catch (err) {
      alert('Gagal export PDF: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="notes-wrap">
      <div className="notes-header">
        <h2 className="notes-title">Catatan Kajian</h2>
        <div className="notes-meta">{entries.length} kalimat tercatat</div>
      </div>
      {entries.length === 0
        ? <div className="notes-empty">Tidak ada transkrip yang tersimpan.</div>
        : <div className="notes-body">
            {entries.map((entry, i) => (
              <div key={entry.id} className="note-entry">
                <div className="note-index">{i + 1}</div>
                <div className="note-content">
                  <p className="note-arabic" dir="rtl" lang="ar">{entry.arabic}</p>
                  <p className="note-indonesian">{entry.indonesian}</p>
                  <time className="note-time">
                    {entry.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </time>
                </div>
              </div>
            ))}
          </div>
      }
      <div className="notes-actions">
        <button className="btn btn-secondary" onClick={handleCopy} disabled={entries.length === 0}>Salin Semua</button>
        <button className="btn btn-pdf" onClick={handleExportPDF} disabled={entries.length === 0 || exporting}>
          {exporting ? 'Menyiapkan PDF…' : 'Export PDF'}
        </button>
        <button className="btn btn-primary" onClick={onReset}>Mulai Sesi Baru</button>
      </div>
    </div>
  );
}

function UnsupportedBrowser() {
  return (
    <div className="unsupported-wrap">
      <h2 className="unsupported-title">Browser Tidak Didukung</h2>
      <p className="unsupported-desc">Gunakan Google Chrome versi terbaru di desktop.</p>
    </div>
  );
}

export default function App() {
  const [mode, setMode]                           = useState('idle');
  const [micStatus, setMicStatus]                 = useState('idle');
  const [currentArabic, setCurrentArabic]         = useState('');
  const [currentIndonesian, setCurrentIndonesian] = useState('');
  const [isTranslating, setIsTranslating]         = useState(false);
  const [errorMsg, setErrorMsg]                   = useState('');
  const [browserSupported, setBrowserSupported]   = useState(true);
  const [arabicFontSize, setArabicFontSize]       = useState(25);
  const [indoFontSize, setIndoFontSize]           = useState(20);

  const { entries, addEntry, clear } = useTranscriptManager();

  const callbacksRef = useRef({});
  callbacksRef.current = {
    onResult: async (arabicText) => {
      setCurrentArabic(arabicText);
      setCurrentIndonesian('');
      setIsTranslating(true);
      setErrorMsg('');
      try {
        const translated = await translateArabicToIndonesian(arabicText);
        setCurrentIndonesian(translated);
        addEntry(arabicText, translated);
      } catch (err) {
        setCurrentIndonesian('[Terjemahan gagal]');
        addEntry(arabicText, '[Terjemahan gagal]');
        setErrorMsg('Error: ' + err.message);
      } finally {
        setIsTranslating(false);
        setCurrentArabic('');
        setCurrentIndonesian('');
      }
    },
    onError:        (msg) => setErrorMsg(msg),
    onStatusChange: (s)   => setMicStatus(s),
  };

  const { start, stop } = useSpeechRecognition(callbacksRef);

  useEffect(() => {
    const ok = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setBrowserSupported(ok);
  }, []);

  const handleStart = () => {
    if (!browserSupported) return;
    clear();
    setCurrentArabic('');
    setCurrentIndonesian('');
    setErrorMsg('');
    setMode('recording');
    start();
  };

  const handleStop = () => {
    stop();
    setMode('done');
    setMicStatus('done');
  };

  const handleReset = () => {
    clear();
    setCurrentArabic('');
    setCurrentIndonesian('');
    setErrorMsg('');
    setMode('idle');
    setMicStatus('idle');
  };

  if (!browserSupported) {
    return <div className="app"><Header /><main className="main"><UnsupportedBrowser /></main><Footer /></div>;
  }

  if (mode === 'done') {
    return <div className="app"><Header /><main className="main"><NotesView entries={entries} onReset={handleReset} /></main><Footer /></div>;
  }

  return (
    <div className="app">
      <Header />
      <main className="main">
        <div className="controls-row">
          <StatusBadge status={micStatus} />
          <div className="btn-group">
            <button className="btn btn-primary btn-large" onClick={handleStart} disabled={mode === 'recording'}>
              Mulai
            </button>
            <button className="btn btn-danger btn-large" onClick={handleStop} disabled={mode !== 'recording'}>
              Selesai
            </button>
          </div>
        </div>
        <div className="sliders-row">
          <FontSlider label="Ukuran teks Arab" value={arabicFontSize} onChange={setArabicFontSize} min={16} max={80} />
          <FontSlider label="Ukuran teks Indonesia" value={indoFontSize} onChange={setIndoFontSize} min={14} max={72} />
        </div>
        {errorMsg && <div className="error-banner">{errorMsg}</div>}
        <HistoryFeed
          entries={entries}
          liveArabic={currentArabic}
          liveIndonesian={currentIndonesian}
          isTranslating={isTranslating}
          arabicFontSize={arabicFontSize}
          indonesianFontSize={indoFontSize}
        />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <span className="header-icon">🕌</span>
          <span className="header-title">SubtitleKajian</span>
        </div>
        <span className="header-sub">Live Subtitle Arab - Indonesia</span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      Gratis 100% - Web Speech API - Google Translate
    </footer>
  );
}
