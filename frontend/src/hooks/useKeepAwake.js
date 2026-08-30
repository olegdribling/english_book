import { useEffect, useRef } from 'react';

// Доступен ли Screen Wake Lock API.
// Требует secure context: HTTPS или localhost. По http (в т.ч. dev-сервер Vite
// по локальной сети) navigator.wakeLock отсутствует и функция недоступна.
export const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

// Хук не даёт экрану гаснуть пока enabled === true и вкладка на переднем плане.
// Лок освобождается при размонтировании компонента и снимается системой при
// уходе вкладки в фон — поэтому переподключаемся по visibilitychange.
export function useKeepAwake(enabled) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (!enabled || !wakeLockSupported) return;

    // Флаг отмены — эффект мог размонтироваться пока запрос лока был в полёте
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || lockRef.current) return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) { lock.release(); return; }
        lockRef.current = lock;
        // Система сама снимает лок при сворачивании — чистим ссылку чтобы взять заново
        lock.addEventListener('release', () => { lockRef.current = null; });
      } catch {
        // NotAllowedError: низкий заряд, режим энергосбережения, вкладка не видима —
        // просто не держим экран, приложение работает как обычно
      }
    };

    // Вернулись из фона — лок уже снят системой, запрашиваем новый
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      lockRef.current?.release();
      lockRef.current = null;
    };
  }, [enabled]);
}
