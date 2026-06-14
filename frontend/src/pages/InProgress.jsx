import { useEffect, useState } from 'react';
import BookCard from '../components/BookCard';
import BookSheet from '../components/BookSheet';
import { useActiveBooks } from '../hooks/useActiveBooks';
import styles from './InProgress.module.css';

// Ключ для сохранения позиции скролла между переходами
const SCROLL_KEY = 'inProgressScrollTop';

export default function InProgress() {
  const { activeBooks, loading, error } = useActiveBooks();
  const [selectedBook, setSelectedBook] = useState(null);

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
            <BookCard
              key={`${book.author}/${book.title}/${book.level}`}
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
