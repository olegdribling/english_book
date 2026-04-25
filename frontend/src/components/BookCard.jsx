import { Volume2 } from 'lucide-react';
import { LEVEL_COLORS } from '../hooks/useBookLevel';
import styles from './BookCard.module.css';

// Карточка книги — при нажатии вызывает onSelect для показа деталей книги
export default function BookCard({ title, author, coverUrl, level, audioUrl, onSelect }) {
  return (
    <button className={styles.card} onClick={onSelect} aria-label={title}>
      <div className={styles.cover}>
        {coverUrl
          ? <img src={coverUrl} alt={title} />
          : <div className={styles.noCover} />
        }
        {level && (
          <span
            className={styles.levelBadge}
            style={{ background: LEVEL_COLORS[level] ?? '#999' }}
          >
            {level}
          </span>
        )}
        {audioUrl && (
          <span className={styles.audioBadge}>
            <Volume2 size={15} strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className={styles.info}>
        <p className={styles.title}>{title}</p>
        <p className={styles.author}>{author}</p>
      </div>
    </button>
  );
}
