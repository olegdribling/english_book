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

// Ключ для хранения последнего адреса в разделе Library (читалка, оглавление, список)
const LAST_LIBRARY_KEY = 'lastLibraryPath';

// Страницы НЕ относящиеся к Library — при переходе на них сохраняем текущий путь
const NON_LIBRARY = ['/audio', '/dictionary', '/settings'];

export default function Nav({ active }) {
  const { pathname, search } = useLocation();

  // Если текущая страница относится к Library — обновляем сохранённый путь (с query-параметрами)
  const isLibraryPath = !NON_LIBRARY.some(p => pathname.startsWith(p));
  if (isLibraryPath) {
    sessionStorage.setItem(LAST_LIBRARY_KEY, pathname + search);
  }

  // Для вкладки Library — возвращаем на последнюю страницу чтения
  const libraryTo = sessionStorage.getItem(LAST_LIBRARY_KEY) || '/';

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
