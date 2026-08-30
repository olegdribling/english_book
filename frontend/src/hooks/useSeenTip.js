import { useState } from 'react';

// Префикс ключей в localStorage для одноразовых анонсов новых функций
const KEY_PREFIX = 'seenTip:';

// Идентификаторы анонсов — по одному на функцию, менять нельзя:
// при смене id анонс покажется повторно всем пользователям
export const TIP_KEEP_AWAKE = 'keepAwake';

// Хук одноразового анонса: возвращает [показывать ли, отметить как просмотренный].
// Анонс показывается ровно один раз на устройство — отметка живёт в localStorage.
export function useSeenTip(id) {
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(KEY_PREFIX + id) === 'true';
    } catch {
      // Приватный режим или запрещённое хранилище — считаем что уже показывали,
      // чтобы не показывать анонс при каждом запуске
      return true;
    }
  });

  const markSeen = () => {
    try {
      localStorage.setItem(KEY_PREFIX + id, 'true');
    } catch { /* игнорируем — анонс всё равно закроется на эту сессию */ }
    setSeen(true);
  };

  return [!seen, markSeen];
}
