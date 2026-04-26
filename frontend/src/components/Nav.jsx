import { Link, useLocation } from 'react-router-dom';
import { BookOpen, GraduationCap, BookMarked, Settings } from 'lucide-react';
import styles from './Nav.module.css';

// Вкладки нижней навигации
const TABS = [
  { id: 'library',     label: 'Library',     Icon: BookOpen,      to: '/'            },
  { id: 'englishpod',  label: 'EnglishPod',  Icon: GraduationCap, to: '/englishpod'  },
  { id: 'dictionary',  label: 'Dictionary',  Icon: BookMarked,    to: '/dictionary'  },
  { id: 'settings',    label: 'Settings',    Icon: Settings,      to: '/settings'    },
];

// Ключи для хранения последнего места в разделе
const LAST_LIBRARY_KEY    = 'lastLibraryPath';
const LAST_ENGLISHPOD_KEY = 'lastEnglishPodPath';

const NON_LIBRARY = ['/englishpod', '/dictionary', '/settings'];

export default function Nav({ active }) {
  const { pathname, search } = useLocation();

  const isLibraryPath    = !NON_LIBRARY.some(p => pathname.startsWith(p));
  const isBookPage       = pathname.startsWith('/book/');
  const isEpLessonPage   = pathname.startsWith('/englishpod/');

  // Сохраняем место когда находимся в соответствующем разделе
  if (isLibraryPath) {
    localStorage.setItem(LAST_LIBRARY_KEY, pathname + search);
  }
  if (pathname.startsWith('/englishpod')) {
    localStorage.setItem(LAST_ENGLISHPOD_KEY, pathname + search);
  }

  // Library: если читаем книгу — на главную, иначе — на последнее место
  const libraryTo = isBookPage
    ? '/'
    : (localStorage.getItem(LAST_LIBRARY_KEY) || '/');

  // EnglishPod: если на странице урока — на список (/englishpod), иначе — на последнее место
  const englishPodTo = isEpLessonPage
    ? '/englishpod'
    : (localStorage.getItem(LAST_ENGLISHPOD_KEY) || '/englishpod');

  return (
    <nav className={styles.nav}>
      {TABS.map(({ id, label, Icon, to }) => (
        <Link
          key={id}
          to={id === 'library' ? libraryTo : id === 'englishpod' ? englishPodTo : to}
          className={`${styles.item} ${active === id ? styles.active : ''}`}
        >
          <Icon size={24} strokeWidth={1.75} />
          <span className={styles.label}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
