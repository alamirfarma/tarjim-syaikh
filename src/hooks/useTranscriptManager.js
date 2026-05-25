import { useState, useCallback, useRef } from 'react';

export function useTranscriptManager() {
  const [entries, setEntries] = useState([]);
  const counterRef = useRef(0);

  const addEntry = useCallback((arabicText, indonesianText) => {
    counterRef.current += 1;
    const entry = {
      id: counterRef.current,
      arabic: arabicText,
      indonesian: indonesianText,
      timestamp: new Date(),
    };
    setEntries(prev => [...prev, entry]);
    return entry;
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    counterRef.current = 0;
  }, []);

  const getFullTranscript = useCallback((currentEntries) => {
    return (currentEntries || entries).map(e => e.indonesian).join('\n\n');
  }, [entries]);

  return { entries, addEntry, clear, getFullTranscript };
}
