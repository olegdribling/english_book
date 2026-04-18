import { useState } from 'react';

const STORAGE_KEY = 'translateLine';

// Хук для чтения и сохранения настройки "переводить строку целиком"
export function useTranslateLine() {
  const [translateLine, setTranslateLineState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const setTranslateLine = (val) => {
    localStorage.setItem(STORAGE_KEY, String(val));
    setTranslateLineState(val);
  };

  return [translateLine, setTranslateLine];
}
