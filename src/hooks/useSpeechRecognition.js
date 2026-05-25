import { useRef } from 'react';

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function isArabicText(text) {
  if (!text || text.trim().length === 0) return false;
  const chars = text.replace(/\s/g, '');
  if (chars.length === 0) return false;
  let count = 0;
  for (let i = 0; i < chars.length; i++) {
    if (ARABIC_RE.test(chars[i])) count++;
  }
  return (count / chars.length) >= 0.2;
}

export function useSpeechRecognition(callbacksRef) {
  const recognitionRef = useRef(null);
  const isRunningRef   = useRef(false);
  const startedRef     = useRef(false);

  function start() {
    if (startedRef.current) return;
    const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    if (!supported) {
      callbacksRef.current && callbacksRef.current.onError('Browser tidak mendukung Web Speech API.');
      return;
    }

    startedRef.current   = true;
    isRunningRef.current = true;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang            = 'ar-SA';
    recognition.continuous      = true;
    recognition.interimResults  = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (callbacksRef.current) callbacksRef.current.onStatusChange('listening');
    };

    recognition.onresult = (event) => {
      if (!callbacksRef.current) return;
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        if (transcript && isArabicText(transcript)) {
          callbacksRef.current.onResult(transcript);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      if (event.error === 'aborted')   return;
      if (callbacksRef.current) {
        callbacksRef.current.onError('Error: ' + event.error);
        callbacksRef.current.onStatusChange('error');
      }
    };

    recognition.onend = () => {
      if (isRunningRef.current) {
        try { recognition.start(); } catch {
          isRunningRef.current = false;
          if (callbacksRef.current) callbacksRef.current.onStatusChange('idle');
        }
      } else {
        if (callbacksRef.current) callbacksRef.current.onStatusChange('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stop() {
    startedRef.current   = false;
    isRunningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }

  return { start, stop };
}
