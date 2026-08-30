import { useState } from 'react';

const STORAGE_KEY = 'keepAwake';

// Хук для чтения и сохранения настройки "не выключать экран во время чтения"
export function useKeepAwakeSetting() {
  const [keepAwake, setKeepAwakeState] = useState(() => {
    // По умолчанию выключено — постоянно включённый экран расходует батарею
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const setKeepAwake = (val) => {
    localStorage.setItem(STORAGE_KEY, String(val));
    setKeepAwakeState(val);
  };

  return [keepAwake, setKeepAwake];
}
