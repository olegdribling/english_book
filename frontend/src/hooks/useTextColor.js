import { useState, useEffect } from 'react';

// Доступные цвета текста читалки
export const TEXT_COLORS = [
  { value: '#1a1a1a', label: 'Black'      },  // контрастный
  { value: '#ffffff', label: 'White'      },  // контрастный
  { value: '#4a4a4a', label: 'Soft dark'  },  // спокойный
  { value: '#8b7355', label: 'Warm brown' },  // спокойный
  { value: '#2d3748', label: 'Slate'      },  // авторский
  { value: '#c8b89a', label: 'Beige'      },  // авторский
];

const STORAGE_KEY = 'readerTextColor';
const CSS_VAR     = '--text-primary';
const DEFAULT     = '#1a1a1a';

// Хук для чтения и сохранения цвета текста — применяет CSS-переменную глобально
export function useTextColor() {
  const [textColor, setTextColorState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT
  );

  // Применяем CSS-переменную при монтировании компонента
  useEffect(() => {
    document.documentElement.style.setProperty(CSS_VAR, textColor);
  }, [textColor]);

  const setTextColor = (color) => {
    localStorage.setItem(STORAGE_KEY, color);
    document.documentElement.style.setProperty(CSS_VAR, color);
    setTextColorState(color);
  };

  return [textColor, setTextColor];
}
