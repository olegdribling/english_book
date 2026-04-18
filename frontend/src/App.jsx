import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useBgColor } from './hooks/useBgColor';
import { useTextColor } from './hooks/useTextColor';
import Nav from './components/Nav';
import Header from './components/Header';
import Library from './pages/Library';
import BookToc from './pages/BookToc';
import Reader from './pages/Reader';
import Audio from './pages/Audio';
import Dictionary from './pages/Dictionary';
import Settings from './pages/Settings';
import './App.css';

const TAB_ROUTES = {
  library:    '/',
  audio:      '/audio',
  dictionary: '/dictionary',
  settings:   '/settings',
};

function useActiveTab() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/audio'))      return 'audio';
  if (pathname.startsWith('/dictionary')) return 'dictionary';
  if (pathname.startsWith('/settings'))   return 'settings';
  return 'library';
}

export default function App() {
  const activeTab = useActiveTab();
  // Применяем сохранённые цвета при загрузке приложения
  useBgColor();
  useTextColor();

  return (
    <div className="layout">
      <Nav active={activeTab} routes={TAB_ROUTES} />
      <div className="content">
        <Header activeTab={activeTab} />
        <main className="main">
          <Routes>
            <Route path="/"                                    element={<Library />} />
            <Route path="/book/:author/:title"                 element={<BookToc />} />
            <Route path="/book/:author/:title/chapter/:index"  element={<Reader />} />
            <Route path="/audio"                               element={<Audio />} />
            <Route path="/dictionary"                          element={<Dictionary />} />
            <Route path="/settings"                            element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
