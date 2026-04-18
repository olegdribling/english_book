import { useState } from 'react';

// Доступные размеры шрифта для читалки
export const FONT_SIZES = [
  { label: 'Small',   value: 14 },
  { label: 'Medium',  value: 16 },
  { label: 'Large',   value: 18 },
];

// Размер по умолчанию
const DEFAULT_SIZE = 16;
const STORAGE_KEY  = 'readerFontSize';

// Хук для чтения и сохранения размера шрифта читалки в localStorage
export function useFontSize() {
  const [fontSize, setFontSizeState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_SIZE;
  });

  const setFontSize = (size) => {
    localStorage.setItem(STORAGE_KEY, String(size));
    setFontSizeState(size);
  };

  return [fontSize, setFontSize];
}
