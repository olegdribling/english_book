import { useEffect, useRef } from 'react';

// Хук свайп-навигации — вешает touch-слушатели на document,
// вызывает onSwipeLeft / onSwipeRight при горизонтальном свайпе
export function useSwipeNav({ enabled, onSwipeLeft, onSwipeRight }) {
  // Используем ref чтобы не пересоздавать слушатели при смене колбэков
  const callbacksRef = useRef({ onSwipeLeft, onSwipeRight });
  useEffect(() => {
    callbacksRef.current = { onSwipeLeft, onSwipeRight };
  });

  useEffect(() => {
    if (!enabled) return;

    let startX = 0;
    let startY = 0;

    const onTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;

      // Срабатывает только при горизонтальном свайпе (не скролл)
      if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;

      if (dx < 0) {
        callbacksRef.current.onSwipeLeft?.();
      } else {
        callbacksRef.current.onSwipeRight?.();
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled]);
}
