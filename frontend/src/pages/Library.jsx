import { useEffect, useState } from 'react';
import BookCard from '../components/BookCard';
import BookSheet from '../components/BookSheet';
import { LEVELS } from '../hooks/useBookLevel';
import styles from './Library.module.css';

// Ключ для сохранения позиции скролла между переходами
const SCROLL_KEY = 'libraryScrollTop';

export default function Library() {
  const [books, setBooks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  // Выбранная книга для показа bottom sheet
  const [selectedBook, setSelectedBook] = useState(null);
  // Активный уровень фильтрации — сохраняется между переходами
  const [activeLevel, setActiveLevel] = useState(
    () => localStorage.getItem('libraryLevel') || ''
  );

  useEffect(() => {
    fetch('/api/books')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        setBooks(data);
        setLoading(false);
        // При первом визите выбираем первый уровень у которого есть книги
        if (!localStorage.getItem('libraryLevel') && data.length > 0) {
          const first = LEVELS.find(l => data.some(b => b.level === l.value));
          if (first) {
            setActiveLevel(first.value);
            localStorage.setItem('libraryLevel', first.value);
          }
        }
      })
      .catch(() => { setError('Could not load library'); setLoading(false); });
  }, []);

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

  // Уровни у которых есть хотя бы одна книга, в правильном порядке
  const availableLevels = LEVELS.filter(l => books.some(b => b.level === l.value));
  const visibleBooks    = activeLevel ? books.filter(b => b.level === activeLevel) : books;

  function selectLevel(level) {
    setActiveLevel(level);
    localStorage.setItem('libraryLevel', level);
  }

  if (loading) return <div className={styles.center}><p className={styles.hint}>Loading...</p></div>;
  if (error)   return <div className={styles.center}><p className={styles.hint}>{error}</p></div>;
  if (!books.length) return <div className={styles.center}><p className={styles.hint}>No books yet</p></div>;

  return (
    <>
      <div className={styles.page}>
        {/* Табы выбора уровня — показываем только если уровней больше одного */}
        {availableLevels.length > 1 && (
          <div className={styles.tabs}>
            {availableLevels.map(({ value, color }) => (
              <button
                key={value}
                className={`${styles.tab} ${activeLevel === value ? styles.tabActive : ''}`}
                style={activeLevel === value ? { background: color, borderColor: color } : {}}
                onClick={() => selectLevel(value)}
              >
                {value}
              </button>
            ))}
          </div>
        )}

        <div className={styles.grid}>
          {visibleBooks.map(book => (
            <BookCard
              key={`${book.author}/${book.title}`}
              {...book}
              onSelect={() => setSelectedBook(book)}
            />
          ))}
        </div>
      </div>

      {/* Bottom sheet с деталями выбранной книги */}
      {selectedBook && (
        <BookSheet
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </>
  );
}
