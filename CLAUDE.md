# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Правила проекта english_book

## Язык общения
Всегда общаться с пользователем на русском языке.

## Git
- Перед любым `git push` — остановиться и спросить подтверждение у пользователя.
- Никогда не добавлять строки `Co-Authored-By: Claude...` в коммиты.

## Код
- Перед каждой новой функцией, константой или важным блоком кода — комментарий на русском языке: что это и для чего.
  Пример: `// Регулярка для проверки что строка — одно английское слово`
- Каждая страница, компонент, хук — в отдельном файле. Не смешивать логику разных секций в одном файле.

## Структура проекта
- При создании любого нового файла или папки — обновить `STRUCTURE.md`: добавить строку в схему с описанием на русском языке.

## Стек
- Backend: Node.js + Express 5 (`server.js`)
- Frontend: React + Vite (`frontend/`)
- Перевод слов: DeepL API (Free, ключ заканчивается на `:fx`)
- Хостинг: Hostinger (Node.js Web App, деплой из GitHub, ветка `main`)
- Репозиторий: https://github.com/olegdribling/english_book

## Структура библиотеки

- `library/{LEVEL}/{Автор}/{Книга}/` — все книги по уровням (в git)
  - Уровни: `A1/`, `A2/`, `B1/`, `B1+/`, `B2/`, `B2+/`, `C1/`
  - Пример: `library/B1/Lewis Carroll/Alice's Adventures in Wonderland/Alice.txt`
  - Книга содержит `.txt` с текстом, файл обложки (`.jpg`/`.png`), опционально `.mp3` и `*_about.txt`
  - На сервере путь к библиотеке может переопределяться через `LIBRARY_DIR` (чтобы деплой не удалял файлы)

## Команды разработки

```bash
# Запустить backend (порт 3001)
node server.js

# Запустить frontend dev-сервер (порт 5173, с прокси на 3001)
cd frontend && npm run dev

# Сборка для продакшна (из корня)
npm run build

# Линтинг фронтенда
cd frontend && npm run lint
```

Переменные окружения (файл `.env` в корне):
- `DEEPL_API_KEY` — ключ DeepL API
- `PORT` — порт сервера (по умолчанию 3001)
- `LIBRARY_DIR` — путь к папке с книгами (по умолчанию `./library`)
- `ENGLISHPOD_DIR` — путь к папке EnglishPod (по умолчанию `./library/EnglishPod`)
- `NODE_ENV=production` — включает раздачу статики фронтенда

## Архитектура

### Backend (`server.js`)
Один файл, Express 5. Ключевые API-маршруты:
- `GET /api/books` — список всех книг из всех уровневых папок
- `GET /api/books/:author/:title/chapter/0?level=A1` — текст книги (все книги одноглавые, index всегда 0)
- `GET /api/translate?word=hello&to=RU` — перевод через DeepL (с in-memory кэшем)
- `GET /api/word-info?word=hello` — транскрипция и аудио произношения (Free Dictionary API, с кэшем)
- `GET /api/englishpod` — список уроков EnglishPod по уровням
- `GET /api/englishpod/:level/:folder` — PDF/HTML/MP3 файлы конкретного урока
- `/covers/*` — статика обложек и MP3 книг
- `/englishpod-files/*` — статика файлов EnglishPod

**Важно:** все книги в библиотеке одноглавые (сплошной текст без оглавления). Маршрут `/toc` и логика парсинга глав в server.js существуют, но на практике всегда возвращают `noToc: true`.

### Frontend (`frontend/src/`)
React SPA с react-router-dom. Маршруты:
- `/` → `Library` — каталог книг
- `/in-progress` → `InProgress` — активно читаемые книги (клик сразу открывает Reader)
- `/book/:author/:title` → `BookToc` — промежуточная страница перед читалкой
- `/book/:author/:title/chapter/:index` → `Reader` — ридер в режиме перелистывания страниц (swipe)
- `/dictionary` → `Dictionary` — сохранённые слова
- `/settings` → `Settings` — настройки
- `/englishpod` → `EnglishPod` — список уроков
- `/englishpod/:level/:folder` → `EnglishPodLesson` — урок

Навигация в Reader — только свайп/перелистывание (`swipeNav` всегда `true`). Прогресс чтения хранится в `flip:/book/:author/:title/chapter/0` (текущая страница) и `flip:...:total` (всего страниц).

Хуки (`frontend/src/hooks/`):
- `usePaginate` — разбивка текста на страницы для режима перелистывания
- `usePageNumbers` — номера страниц
- `useSavedWords` — словарь (localStorage)
- `useActiveBooks` — список активно читаемых книг + прогресс по `flip:` ключам
- `useWordInteraction` — клик по слову → перевод
- `useSwipeNav` / `useSwipeNavSetting` — свайп-навигация (всегда включена)
- `useBgColor` / `useTextColor` / `useFontSize` / `useBookLevel` — настройки из localStorage

Компоненты (`frontend/src/components/`):
- `TranslationPopup` — всплывающий попап с переводом, транскрипцией и кнопкой сохранения
- `BookSheet` — bottom sheet с описанием книги (на странице Library)
- `BookPageFlip` — анимация перелистывания страниц
- `AddWordModal` — модальное окно добавления слова в словарь
