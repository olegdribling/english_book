import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveLevel } from '../hooks/useBookLevel';
import styles from './BookSheet.module.css';

// Регулярка для удаления суффикса уровня из названия книги (_A1, _B2 и т.д.)
const LEVEL_SUFFIX_RE = /_([AB][12]|C1)$/;

// Нижний лист (bottom sheet) с деталями книги: обложка, кнопка чтения
export default function BookSheet({ book, onClose }) {
  const navigate = useNavigate();

  // Оригинальное название без суффикса уровня
  const originalTitle = book.title.replace(LEVEL_SUFFIX_RE, '');
  const level = book.level || 'C1';

  // Ключ прогресса чтения для данного уровня
  const progressKey  = `lastRead:${book.author}/${originalTitle}:${level}`;
  const savedChapter = localStorage.getItem(progressKey);
  const hasProgress  = savedChapter !== null;

  // Закрытие при клике на бэкдроп
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Закрытие по Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleRead = () => {
    saveLevel(book.author, originalTitle, level);
    const author  = encodeURIComponent(book.author);
    const title   = encodeURIComponent(originalTitle);
    const chapter = hasProgress ? savedChapter : 0;
    navigate(`/book/${author}/${title}/chapter/${chapter}?level=${level}`);
    onClose();
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdrop}>
      <div className={styles.sheet}>
        {/* Ручка для визуального обозначения что лист можно закрыть */}
        <div className={styles.handle} />

        <div className={styles.content}>
          {/* Обложка книги */}
          <div className={styles.cover}>
            {book.coverUrl
              ? <img src={book.coverUrl} alt={book.title} />
              : <div className={styles.noCover} />
            }
          </div>

          {/* Название и автор */}
          <p className={styles.title}>{originalTitle}</p>
          <p className={styles.author}>{book.author}</p>

          {/* Кнопка Читать / Продолжить */}
          <button className={styles.readBtn} onClick={handleRead}>
            {hasProgress ? 'Continue' : 'Read'}
          </button>
        </div>
      </div>
    </div>
  );
}
