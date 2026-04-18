import { useState } from 'react';

const STORAGE_KEY = 'showPageNumbers';

// Хук для чтения и сохранения настройки "показывать нумерацию страниц"
export function usePageNumbers() {
  const [showPageNumbers, setShowPageNumbersState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // По умолчанию включено
    return saved === null ? true : saved === 'true';
  });

  const setShowPageNumbers = (val) => {
    localStorage.setItem(STORAGE_KEY, String(val));
    setShowPageNumbersState(val);
  };

  return [showPageNumbers, setShowPageNumbers];
}
