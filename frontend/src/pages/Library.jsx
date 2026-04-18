import { useEffect, useState } from 'react';
import BookCard from '../components/BookCard';
import BookSheet from '../components/BookSheet';
import styles from './Library.module.css';

// Ключ для сохранения позиции скролла между переходами
const SCROLL_KEY = 'libraryScrollTop';

export default function Library() {
  const [books, setBooks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  // Выбранная книга для показа bottom sheet
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    fetch('/api/books')
      .then(r => r.json())
      .then(data => { setBooks(data); setLoading(false); })
      .catch(() => { setError('Could not load library'); setLoading(false); });
  }, []);

  // Восстанавливаем позицию скролла и сохраняем её при каждом скролле
  useEffect(() => {
    if (loading) return;
    const main = document.querySelector('.main');
    if (!main) return;

    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) main.scrollTop = parseInt(saved, 10);

    let timer;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem(SCROLL_KEY, String(main.scrollTop));
      }, 100);
    };

    main.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, [loading]);

  if (loading) return <div className={styles.center}><p className={styles.hint}>Loading...</p></div>;
  if (error)   return <div className={styles.center}><p className={styles.hint}>{error}</p></div>;
  if (!books.length) return <div className={styles.center}><p className={styles.hint}>No books yet</p></div>;

  return (
    <>
      <div className={styles.page}>
        <div className={styles.grid}>
          {books.map(book => (
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
