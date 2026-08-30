import { Routes, Route, useLocation } from 'react-router-dom';
import { Sun } from 'lucide-react';
import { useBgColor } from './hooks/useBgColor';
import { useTextColor } from './hooks/useTextColor';
import { useSeenTip, TIP_KEEP_AWAKE } from './hooks/useSeenTip';
import { wakeLockSupported } from './hooks/useKeepAwake';
import Nav from './components/Nav';
import Header from './components/Header';
import Library from './pages/Library';
import InProgress from './pages/InProgress';
import BookToc from './pages/BookToc';
import Reader from './pages/Reader';
import Dictionary from './pages/Dictionary';
import Settings from './pages/Settings';
import EnglishPod from './pages/EnglishPod';
import EnglishPodLesson from './pages/EnglishPodLesson';
import WhatsNewModal from './components/WhatsNewModal';
import './App.css';

const TAB_ROUTES = {
  library:    '/',
  englishpod: '/englishpod',
  dictionary: '/dictionary',
  settings:   '/settings',
};

function useActiveTab() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/englishpod')) return 'englishpod';
  if (pathname.startsWith('/dictionary')) return 'dictionary';
  if (pathname.startsWith('/settings'))   return 'settings';
  return 'library';
}

export default function App() {
  const activeTab = useActiveTab();
  // Применяем сохранённые цвета при загрузке приложения
  useBgColor();
  useTextColor();

  // Одноразовый анонс настройки "Keep screen on".
  // Не показываем если браузер не поддерживает Wake Lock — иначе рассказали бы
  // о функции, которой у пользователя нет
  const [showKeepAwakeTip, dismissKeepAwakeTip] = useSeenTip(TIP_KEEP_AWAKE);

  return (
    <div className="layout">
      <div id="app-nav"><Nav active={activeTab} routes={TAB_ROUTES} /></div>
      <div id="app-header"><Header activeTab={activeTab} /></div>
      <main className="main">
        <Routes>
          <Route path="/"                                    element={<Library />} />
          <Route path="/in-progress"                         element={<InProgress />} />
          <Route path="/book/:author/:title"                 element={<BookToc />} />
          <Route path="/book/:author/:title/chapter/:index"  element={<Reader />} />
          <Route path="/englishpod"                          element={<EnglishPod />} />
          <Route path="/englishpod/:level/:folder"           element={<EnglishPodLesson />} />
          <Route path="/dictionary"                          element={<Dictionary />} />
          <Route path="/settings"                            element={<Settings />} />
        </Routes>
      </main>

      <WhatsNewModal
        open={showKeepAwakeTip && wakeLockSupported}
        icon={<Sun size={26} />}
        title="Keep screen on"
        onClose={dismissKeepAwakeTip}
      >
        Tired of tapping the screen to keep it awake while reading?
        Turn on <b>Keep screen on</b> in Settings — the screen stays lit
        while a book or an EnglishPod lesson is open.
      </WhatsNewModal>
    </div>
  );
}
