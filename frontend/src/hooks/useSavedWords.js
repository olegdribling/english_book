import { useState, useCallback, useEffect } from 'react';

// Хук для хранения сохранённых слов словаря в localStorage
const STORAGE_KEY = 'savedWords';

export function loadWords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveWords(words) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

// Сохраняет слово с переводом напрямую в localStorage (без React state)
export function saveWord(word, translation) {
  const existing = loadWords();
  if (existing.some(w => w.word.toLowerCase() === word.toLowerCase())) return false;
  saveWords([{ word, translation, savedAt: Date.now() }, ...existing]);
  return true;
}

// Проверяет сохранено ли слово — без React, вызывается вне хука
export function isWordSaved(word) {
  return loadWords().some(w => w.word.toLowerCase() === word.toLowerCase());
}

// Возвращает [words, { remove }] — для Dictionary
// Обновляется через storage-событие когда слово добавляется из другого компонента
export function useSavedWords() {
  const [words, setWords] = useState(loadWords);

  // Подписываемся на изменения localStorage от других компонентов
  useEffect(() => {
    const onStorage = () => setWords(loadWords());
    window.addEventListener('savedWordsUpdated', onStorage);
    return () => window.removeEventListener('savedWordsUpdated', onStorage);
  }, []);

  const remove = useCallback((word) => {
    setWords(prev => {
      const next = prev.filter(w => w.word.toLowerCase() !== word.toLowerCase());
      saveWords(next);
      return next;
    });
  }, []);

  return [words, { remove }];
}
