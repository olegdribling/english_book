# Инструкции для AI-агентов — english_book

**english_book** — приложение для чтения англоязычной литературы с встроенным словарём и переводом. Комбинирует классические книги (A1–C1), курс EnglishPod и инструменты изучения.

## 🚀 Быстрый старт

### Команды
```bash
# Разработка: бэкенд на :3001, фронтенд на :5173
npm start                                # Запустить Express-сервер
cd frontend && npm run dev              # В отдельном терминале: запустить Vite

# Production
npm run build                           # Собрать фронтенд (→ frontend/dist/)
NODE_ENV=production npm start           # Запустить с собранным фронтендом
```

### Окружение
Скопируй `.env.example` → `.env` и заполни:
- `DEEPL_API_KEY` (для перевода слов)
- `GROQ_API_KEY` (если используется)

## 📁 Структура проекта

- **`server.js`** — Express API: эндпоинты для книг, уроков, словаря
- **`frontend/`** — React + Vite приложение
  - `src/pages/` — основные экраны (Library, Reader, Dictionary, EnglishPod)
  - `src/components/` — переиспользуемые компоненты (BookCard, TranslationPopup и т.д.)
  - `src/hooks/` — state logic (useSavedWords, useFontSize, useSwipeNav и т.д.)
- **`library/`** — книги по уровням (`A1/`, `A2/`, `B1/`, `B2/`, `C1/`)
  - Каждая книга: `/Автор/Название/{текст.txt, обложка.{jpg|png}}`
  - `library/EnglishPod/` — курс уроков (MP3, PDF)

📖 Полная структура: см. [`STRUCTURE.md`](STRUCTURE.md)

## 🎨 Архитектура Frontend

- **React Router** для навигации между разделами (Library → Reader → Dictionary → Settings)
- **CSS Modules** для локальных стилей (без污染 глобального namespace)
- **localStorage** для персистентных настроек (размер шрифта, цвет фона, сохранённые слова)
- **bottom sheet** компоненты для UI взаимодействия (BookSheet, AddWordModal)
- **CSS animations** для переворачивания страниц (BookPageFlip)

## 💬 Проектные правила

См. [`CLAUDE.md`](CLAUDE.md) — обязательно читай перед кодингом:
- ✅ **Язык**: комментарии в коде на русском (что это + для чего)
- ✅ **Файлы**: каждый компонент/хук/страница — отдельный файл
- ✅ **Git**: перед `push` — всегда спроси подтверждение пользователя
- ✅ **Документация**: добавь новый файл → обнови `STRUCTURE.md`

## 🔧 API endpoints (backend)

Проверь `server.js` для полного списка. Основные:
- `GET /api/books/:level` — список книг уровня
- `GET /api/book/:level/:author/:title` — содержимое книги (текст из `.txt`)
- `GET /api/englishpod/:level` — список уроков EnglishPod уровня
- `GET /englishpod-files/...` — MP3 и PDF файлы уроков
- `GET /covers/...` — обложки книг из `library/`

**Важно**: нет БД. Книги хранятся как `.txt` файлы в `library/`, сервер их отдаёт как есть.

## 📦 Стек

| Слой | Технология |
|------|-----------|
| Backend | Node.js 18+ + Express 5 |
| Frontend | React 18 + Vite |
| Перевод | DeepL API (Free) |
| Стили | CSS Modules |
| Router | React Router v6 |
| Хостинг | Hostinger (Node.js Web App из GitHub) |

## ✨ Типовые задачи

### Добавить новую страницу
1. Создай `frontend/src/pages/MyPage.jsx`
2. Создай `frontend/src/pages/MyPage.module.css`
3. Импортируй в `App.jsx`, добавь маршрут
4. Добавь иконку в `public/icons.svg` (если нужна в Nav)
5. Обнови `STRUCTURE.md`

### Добавить компонент
1. Создай `frontend/src/components/MyComponent.jsx`
2. Создай `frontend/src/components/MyComponent.module.css`
3. Используй как обычный React компонент

### Добавить хук
1. Создай `frontend/src/hooks/useMyHook.js`
2. Используй `localStorage` или состояние для персистентности
3. Экспортируй как default

## ⚠️ Частые ошибки

- ❌ Не смешивай несколько компонентов в одном файле
- ❌ Не забывай обновлять `STRUCTURE.md` при создании файлов
- ❌ Не добавляй `Co-Authored-By: Claude` в коммиты
- ❌ Перед `git push` — всегда жди подтверждение пользователя
