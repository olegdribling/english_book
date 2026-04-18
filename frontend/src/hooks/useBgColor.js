import { useState, useEffect } from 'react';

// Доступные цвета фона читалки
export const BG_COLORS = [
  { value: '#ffffff', label: 'White'      },  // контрастный
  { value: '#1a1a1a', label: 'Black'      },  // контрастный
  { value: '#fdf6e3', label: 'Sepia'      },  // спокойный
  { value: '#dce8f0', label: 'Blue mist'  },  // спокойный
  { value: '#2c2c3e', label: 'Midnight'   },  // авторский
  { value: '#f5f0e8', label: 'Cream'      },  // авторский
];

const STORAGE_KEY = 'readerBgColor';
const CSS_VAR     = '--bg';
const DEFAULT     = '#ffffff';

// Хук для чтения и сохранения цвета фона — применяет CSS-переменную глобально
export function useBgColor() {
  const [bgColor, setBgColorState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT
  );

  // Применяем CSS-переменную при монтировании компонента
  useEffect(() => {
    document.documentElement.style.setProperty(CSS_VAR, bgColor);
  }, [bgColor]);

  const setBgColor = (color) => {
    localStorage.setItem(STORAGE_KEY, color);
    document.documentElement.style.setProperty(CSS_VAR, color);
    setBgColorState(color);
  };

  return [bgColor, setBgColor];
}
