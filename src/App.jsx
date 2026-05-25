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

function SubtitlePanel({ arabicText, indonesianText, isTranslating, arabicFontSize, indonesianFontSize }) {
  return (
    <div className="subtitle-wrap">
      <div className="panel panel-arabic">
        <div className="panel-label">
          <span className="panel-flag">🕌</span> Ucapan Syaikh
        </div>
        <div className="panel-text arabic-text" dir="rtl" lang="ar"
          style={{ fontSize: arabicFontSize + 'px' }}>
          {arabicText || <span className="placeholder-text">Kalimat bahasa Arab akan muncul di sini</span>}
        </div>
      </div>
      <div className="panel panel-indonesian">
        <div className="panel-label">
          <span className="panel-flag">🇮🇩</span> Terjemahan Indonesia
        </div>
        <div className="panel-text indonesian-text" style={{ fontSize: indonesianFontSize + 'px' }}>
          {isTranslating
            ? <span className="translating-indicator">
                <span className="dots"><span /><span /><span /></span>
                Menerjemahkan
              </span>
            : indonesianText || <span className="placeholder-text">Terjemahan akan muncul di sini</span>
          }
        </div>
      </div>
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
      // Load libraries
      await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      const jsPDF = window.jspdf.jsPDF;
      const html2canvas = window.html2canvas;
  
      // Buat elemen HTML sementara di luar layar
      const container = document.createElement('div');
      container.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 794px;
        background: white;
        font-family: 'Noto Naskh Arabic', 'Lato', sans-serif;
        padding: 0;
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
                <div style="text-align:right; font-family:'Noto Naskh Arabic',serif; font-size:18px; color:#333; direction:rtl; flex:1; margin-left:12px; word-break:break-word; overflow-wrap:break-word;">
                  ${entry.arabic}
                </div>
              </div>
              <div style="font-family:sans-serif; font-size:13px; color:#1a1a1a; line-height:1.7; margin-left:24px; margin-right:0; word-break:break-word; overflow-wrap:break-word; max-width:100%;">
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
  
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });
  
      document.body.removeChild(container);
  
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
  
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
  
      // Kalau konten lebih dari satu halaman
      let posY = 0;
      while (posY < imgH) {
        if (posY > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, -posY, imgW, imgH);
        posY += pageH;
      }
  
      doc.save(`catatan-kajian-${Date.now()}.pdf`);
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
          {exporting ? 'Menyiapkan PDF' : 'Export PDF'}
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

  // Semua callback dalam satu ref — selalu fresh, tidak pernah stale
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
      }
    },
    onError: (msg) => setErrorMsg(msg),
    onStatusChange: (s) => setMicStatus(s),
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
        <SubtitlePanel
          arabicText={currentArabic}
          indonesianText={currentIndonesian}
          isTranslating={isTranslating}
          arabicFontSize={arabicFontSize}
          indonesianFontSize={indoFontSize}
        />
        {mode === 'recording' && entries.length > 0 && (
          <div className="session-counter">{entries.length} kalimat tercatat</div>
        )}
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
