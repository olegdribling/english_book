import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookCard from '../components/BookCard';
import { useActiveBooks } from '../hooks/useActiveBooks';
import { saveLevel } from '../hooks/useBookLevel';
import styles from './InProgress.module.css';

// Регулярка для удаления суффикса уровня из названия книги
const LEVEL_SUFFIX_RE = /_([AB][12]|C1)$/;

// Ключ для сохранения позиции скролла между переходами
const SCROLL_KEY = 'inProgressScrollTop';

export default function InProgress() {
  const { activeBooks, loading, error } = useActiveBooks();
  const navigate = useNavigate();

  // Открываем книгу сразу на последней читаемой странице
  const handleOpen = (book) => {
    const originalTitle = book.title.replace(LEVEL_SUFFIX_RE, '');
    const level = book.level || 'C1';
    const progressKey = `lastRead:${book.author}/${originalTitle}:${level}`;
    const savedChapter = localStorage.getItem(progressKey) ?? '0';
    saveLevel(book.author, originalTitle, level);
    navigate(`/book/${encodeURIComponent(book.author)}/${encodeURIComponent(originalTitle)}/chapter/${savedChapter}?level=${encodeURIComponent(level)}`);
  };

  // Восстанавливаем позицию скролла и сохраняем её при каждом скролле
  useEffect(() => {
    if (loading) return;
    const main = document.querySelector('.main');
    if (!main) return;

    const saved = localStorage.getItem(SCROLL_KEY);
    if (saved) main.scrollTop = parseInt(saved, 10);

    let timer;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.setItem(SCROLL_KEY, String(main.scrollTop));
      }, 100);
    };

    main.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className={styles.center}>
        <p className={styles.hint}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.center}>
        <p className={styles.hint}>Error: {error}</p>
      </div>
    );
  }

  if (!activeBooks.length) {
    return (
      <div className={styles.center}>
        <p className={styles.hint}>No books in progress yet</p>
        <p className={styles.subhint}>Start reading to see your progress here</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.page}>
        <div className={styles.grid}>
          {activeBooks.map(book => (
            <div key={`${book.author}/${book.title}/${book.level}`} className={styles.bookWrap}>
              <BookCard
                {...book}
                onSelect={() => handleOpen(book)}
              />
              {/* Полоска прогресса прочтения — показываем только если есть реальный прогресс */}
              {book.progress > 0 && (
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${Math.min(Math.round(book.progress * 100), 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </>
  );
}
