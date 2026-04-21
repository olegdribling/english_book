import { useState } from 'react';
import { useSavedWords } from '../hooks/useSavedWords';
import styles from './Dictionary.module.css';

// Страница словаря — сетка flip-карточек с сохранёнными словами
export default function Dictionary() {
  const [words, { remove }]  = useSavedWords();

  // Множество перевёрнутых карточек (ключ — savedAt)
  const [flipped, setFlipped] = useState(new Set());

  function toggleFlip(savedAt) {
    setFlipped(prev => {
      const next = new Set(prev);
      next.has(savedAt) ? next.delete(savedAt) : next.add(savedAt);
      return next;
    });
  }

  if (words.length === 0) {
    return <div className={styles.empty}>No saved words yet</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        {words.map(({ word, translation, savedAt }) => (
          <div
            key={savedAt}
            className={`${styles.card} ${flipped.has(savedAt) ? styles.cardFlipped : ''}`}
            onClick={() => toggleFlip(savedAt)}
          >
            <div className={styles.cardInner}>

              {/* Лицевая сторона — слово */}
              <div className={styles.cardFront}>
                {word}
              </div>

              {/* Обратная сторона — перевод и кнопка удаления */}
              <div className={styles.cardBack}>
                <p className={styles.cardTranslation}>{translation}</p>
                <button
                  className={styles.deleteBtn}
                  onClick={e => { e.stopPropagation(); remove(word); }}
                  aria-label="Delete"
                >
                  ×
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
