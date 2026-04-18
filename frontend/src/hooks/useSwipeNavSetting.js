import { useState } from 'react';

const STORAGE_KEY = 'swipeNav';

// Хук для чтения и сохранения настройки "навигация свайпом между главами"
export function useSwipeNavSetting() {
  const [swipeNav, setSwipeNavState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const setSwipeNav = (val) => {
    localStorage.setItem(STORAGE_KEY, String(val));
    setSwipeNavState(val);
  };

  return [swipeNav, setSwipeNav];
}
