import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import styles from './Header.module.css';

// Заголовки для вкладок нижней навигации
const TAB_TITLES = {
  library:    'Library',
  audio:      'Audio',
  dictionary: 'Dictionary',
  settings:   'Settings',
};

// Определяет кнопку "назад" и заголовок книги в зависимости от текущей страницы:
// - читалка (/book/.../chapter/N) → "< Contents" + название книги по центру
// - оглавление (/book/...)        → "< Library"  + название книги по центру
function getBackInfo(pathname, level) {
  const lvlQ = level ? `?level=${level}` : '';

  const chapterMatch = pathname.match(/^\/book\/[^/]+\/([^/]+)\/chapter\/\d+$/);
  if (chapterMatch) {
    const bookTitle = decodeURIComponent(chapterMatch[1]);
    const tocPath   = pathname.replace(/\/chapter\/\d+$/, '') + lvlQ;
    return { label: 'Contents', to: tocPath, bookTitle };
  }

  const tocMatch = pathname.match(/^\/book\/[^/]+\/([^/]+)$/);
  if (tocMatch) {
    const bookTitle = decodeURIComponent(tocMatch[1]);
    return { label: 'Library', to: '/', bookTitle };
  }

  return null;
}

export default function Header({ activeTab }) {
  const { pathname, search } = useLocation();
  const level = new URLSearchParams(search).get('level');

  const back  = getBackInfo(pathname, level);
  const title = TAB_TITLES[activeTab] ?? 'Library';

  return (
    <header className={styles.header}>
      {back ? (
        <>
          <Link to={back.to} className={styles.back}>
            <ChevronLeft size={22} strokeWidth={2} />
            <span className={styles.backLabel}>{back.label}</span>
          </Link>
          <span className={styles.bookTitle}>{back.bookTitle}</span>
        </>
      ) : (
        <span className={styles.title}>{title}</span>
      )}
    </header>
  );
}
