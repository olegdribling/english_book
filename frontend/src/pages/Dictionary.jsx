import { useState } from 'react';
import { useSavedWords } from '../hooks/useSavedWords';
import AddWordModal from '../components/AddWordModal';
import styles from './Dictionary.module.css';

// Страница словаря — сетка flip-карточек с сохранёнными словами
export default function Dictionary() {
  const [words, { remove }]  = useSavedWords();

  // Множество перевёрнутых карточек (ключ — savedAt)
  const [flipped, setFlipped] = useState(new Set());

  // Состояние модалки ручного добавления слова
  const [modalOpen, setModalOpen] = useState(false);

  function toggleFlip(savedAt) {
    setFlipped(prev => {
      const next = new Set(prev);
      next.has(savedAt) ? next.delete(savedAt) : next.add(savedAt);
      return next;
    });
  }

  return (
    <>
      {words.length === 0 ? (
        <div className={styles.empty}>No saved words yet</div>
      ) : (
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
      )}

      {/* FAB-кнопка добавления слова вручную */}
      <button
        className={styles.fab}
        onClick={() => setModalOpen(true)}
        aria-label="Add word"
      >
        +
      </button>

      {/* Модалка ручного добавления слова с автопереводом */}
      <AddWordModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
