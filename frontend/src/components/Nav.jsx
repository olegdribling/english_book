import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Headphones, BookMarked, Settings } from 'lucide-react';
import styles from './Nav.module.css';

// Вкладки нижней навигации
const TABS = [
  { id: 'library',    label: 'Library',    Icon: BookOpen,   to: '/'           },
  { id: 'audio',      label: 'Audio',      Icon: Headphones, to: '/audio'      },
  { id: 'dictionary', label: 'Dictionary', Icon: BookMarked, to: '/dictionary' },
  { id: 'settings',   label: 'Settings',   Icon: Settings,   to: '/settings'   },
];

// Ключ для хранения последнего места чтения
const LAST_LIBRARY_KEY = 'lastLibraryPath';

const NON_LIBRARY = ['/audio', '/dictionary', '/settings'];

export default function Nav({ active }) {
  const { pathname, search } = useLocation();

  const isLibraryPath = !NON_LIBRARY.some(p => pathname.startsWith(p));
  const isBookPage    = pathname.startsWith('/book/');

  // Сохраняем место чтения когда находимся в разделе Library
  if (isLibraryPath) {
    sessionStorage.setItem(LAST_LIBRARY_KEY, pathname + search);
  }

  // Если читаем книгу — Library ведёт на главную.
  // Если в другом разделе — возвращаемся к последнему месту чтения.
  const libraryTo = isBookPage
    ? '/'
    : (sessionStorage.getItem(LAST_LIBRARY_KEY) || '/');

  return (
    <nav className={styles.nav}>
      {TABS.map(({ id, label, Icon, to }) => (
        <Link
          key={id}
          to={id === 'library' ? libraryTo : to}
          className={`${styles.item} ${active === id ? styles.active : ''}`}
        >
          <Icon size={24} strokeWidth={1.75} />
          <span className={styles.label}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
