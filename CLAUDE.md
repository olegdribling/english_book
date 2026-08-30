# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Язык общения
Всегда общаться с пользователем на русском языке.

## Git
- Перед любым `git push` — остановиться и спросить подтверждение у пользователя.
- Никогда не добавлять строки `Co-Authored-By: Claude...` в коммиты.

## Код
- Перед каждой новой функцией, константой или важным блоком кода — комментарий на русском языке: что это и для чего.
  Пример: `// Регулярка для проверки что строка — одно английское слово`
- Каждая страница, компонент, хук — в отдельном файле. Не смешивать логику разных секций в одном файле.
- Стили — CSS-модули рядом с компонентом (`Reader.jsx` + `Reader.module.css`).

## Структура проекта
- При создании любого нового файла или папки — обновить `STRUCTURE.md`: добавить строку в схему с описанием на русском языке.
- `AGENTS.md` — версия этих же инструкций для других AI-агентов; при существенных изменениях держать в согласии с этим файлом.
- `CONTEXT.md` — справочное описание проекта.
- `.claude/englishpod_notes.md` — подробные заметки по разделу EnglishPod (не в git).

## Стек и деплой
- Backend: Node.js + Express 5, ESM (`"type": "module"`), единственный файл `server.js`.
- Frontend: React 19 + Vite + react-router-dom, иконки `lucide-react`.
- Перевод: DeepL API (ключ Free заканчивается на `:fx` → используется `api-free.deepl.com`).
- Транскрипция и произношение: Free Dictionary API (`api.dictionaryapi.dev`).
- Хостинг: Hostinger (Node.js Web App, деплой из GitHub, ветка `main`). `render.yaml` остался от Render и не используется.
- Репозиторий: https://github.com/olegdribling/english_book

## Команды

```bash
# Бэкенд (порт 3001) — из корня
node server.js

# Фронтенд dev-сервер (порт 5173, проксирует /api, /covers, /englishpod-files на :3001)
npm --prefix frontend run dev

# Линтер фронтенда
npm --prefix frontend run lint

# Продакшн-сборка фронтенда (то же делает `npm run build` в корне)
npm --prefix frontend run build

# Запуск как в продакшне: собранный dist отдаётся Express'ом
NODE_ENV=production npm start
```

- Тестов в проекте нет.
- Сервер не перезапускается сам — после правок `server.js`: `pkill -f "node server.js"` и запустить заново.

Переменные окружения (файл `.env` в корне):
- `DEEPL_API_KEY` — ключ DeepL, единственный реально нужный
- `PORT` — порт сервера (по умолчанию 3001)
- `LIBRARY_DIR` — путь к папке с книгами (по умолчанию `./library`)
- `ENGLISHPOD_DIR` — путь к папке EnglishPod (по умолчанию `./library/EnglishPod`)
- `NODE_ENV=production` — включает раздачу собранного фронтенда
- `ANTHROPIC_API_KEY` / `CLAUDE_MODEL` из `.env.example` нигде в коде не читаются

## Архитектура

### Файловая система как база данных
Никакой БД нет: `server.js` на каждый запрос читает `library/` через `fs/promises`. Всё, что «знает» приложение о книге, закодировано в путях и именах файлов:

```
library/{LEVEL}/{Автор}/{Название}/
  ├── *.txt          — текст книги (берётся первый найденный .txt)
  ├── *.jpg|png|webp — обложка
  ├── *.mp3          — озвучка (опционально)
  └── *_about.txt    — описание книги для BookSheet (опционально)
```

- Уровни (`LEVELS` в `server.js`): `A1 A2 B1 B1+ B2 B2+ C1`. Этот же список с цветами продублирован в `frontend/src/hooks/useBookLevel.js` (`LEVEL_COLORS`) — **при добавлении уровня править оба места**.
- Одна и та же книга существует как отдельные адаптации в разных уровневых папках; название может иметь суффикс уровня (`Alice_B1`), который фронтенд срезает регуляркой `/_([AB][12]|C1)$/` чтобы получить «оригинальное» название для ключей прогресса.
- `library/` **не в git** (`.gitignore`) — книги заливаются на сервер по SFTP. Пути переопределяются через `LIBRARY_DIR` / `ENGLISHPOD_DIR`, чтобы деплой не затирал файлы.
- Статика: `/covers/...` → `LIBRARY_DIR`, `/englishpod-files/...` → `ENGLISHPOD_DIR`.

**Важно: все книги в библиотеке одноглавые** — сплошной текст без блока `Contents`. Функции `parseToc` / `extractChapter` и маршрут `/toc` в `server.js` рассчитаны на два формата оглавления (`CHAPTER I.  Title` и просто названия глав, с генерацией римских меток), но на практике всегда срабатывает ветка `noToc: true`, и `index` в маршруте главы всегда `0`.

### API
- `GET /api/books` — плоский список книг со всех уровней: `{ title, author, level, coverUrl, audioUrl, about }`.
- `GET /api/books/:author/:title/toc?level=B1`
- `GET /api/books/:author/:title/chapter/0?level=B1` — текст книги + `audioUrl` + `total`.
- `GET /api/translate?word=...&from=EN&to=RU` — DeepL, кэш в памяти по ключу `word:from:to`.
- `GET /api/word-info?word=...` — `{ phonetic, audioUrl }`, кэш в памяти; ошибки внешнего API отдаются как `null`, а не как 5xx.
- `GET /api/englishpod` — уроки по уровням; `GET /api/englishpod/:level/:folder` — `{ pdf, html, audio }`.
- В продакшне последним стоит SPA-fallback `app.get('*path')` → `frontend/dist/index.html`; любой новый API-роут добавлять **выше** него.

### Frontend — маршруты
- `/` → `Library` — каталог книг с табами уровней
- `/in-progress` → `InProgress` — активно читаемые книги с полоской прогресса, клик сразу открывает читалку
- `/book/:author/:title` → `BookToc` — промежуточная страница перед читалкой
- `/book/:author/:title/chapter/:index` → `Reader` — читалка
- `/dictionary` → `Dictionary` — сохранённые слова
- `/settings` → `Settings` — настройки
- `/englishpod` → `EnglishPod`, `/englishpod/:level/:folder` → `EnglishPodLesson`

### EnglishPod
`library/EnglishPod/{Level}/{NNN-Level-Title}/` c PDF, сконвертированным HTML и тремя MP3. Имена уровневых папок содержат опечатки (`Intermediatle`, `Upper Intermediatly`) и используются как есть — и в API, и в URL. HTML генерируется офлайн скриптом `scripts/pdf_to_html.py` (`pip install pymupdf`, запуск из корня) и его нужно перегонять заново при добавлении уроков. Фронтенд грузит HTML отдельным fetch и вставляет содержимое `<body>` через `dangerouslySetInnerHTML`.

### Состояние фронтенда
Глобального стора нет — состояние живёт в `localStorage` и раздаётся через хуки в `frontend/src/hooks/`. Ключи:
- `savedWords` — словарь; `useSavedWords` слушает кастомное событие `savedWordsUpdated`, потому что слова добавляются из компонентов вне хука (`saveWord`);
- `lastRead:{author}/{title}:{level}` — последняя открытая глава, и `lastRead_ts:...` — время открытия; по ним `useActiveBooks` собирает список для `/in-progress`;
- `flip:/book/{author}/{title}/chapter/0` — номер текущей страницы, `...:total` — всего страниц; из этой пары считается прогресс чтения;
- `bookLevel:{author}/{title}` — выбранный уровень книги;
- `audioTime:{author}/{title}` — позиция воспроизведения озвучки;
- `libraryLevel`, `libraryScrollTop` — состояние каталога;
- `englishpodVisited` — посещённые уроки;
- настройки: размер шрифта, цвета фона/текста, нумерация страниц, `keepAwake`.

Навигация в читалке — только перелистывание: `useSwipeNavSetting` жёстко возвращает `true`, настройки для неё больше нет.

### Хрупкие места
- `useWordInteraction` — самое сложное место. Двойной тап → перевод слова, долгий тап → перевод предложения, на десктопе — выделение мышью. iOS и Android обрабатываются разными путями (на iOS долгое нажатие — свой таймер на `touchstart`, потому что `contextmenu` не даёт координат, а координаты берутся из `touchstart`, а не `touchend`). Правки проверять и на тач-устройстве, и на мыши.
- `usePaginate` — меряет текст в скрытом клоне контейнера и бинарным поиском по словам подбирает, сколько влезает на страницу. Стили клона (`font-size`, `line-height`, `padding`) должны совпадать со стилями реального контейнера, иначе разбивка врёт.
- `useKeepAwake` — Screen Wake Lock API требует HTTPS. Dev-сервер Vite поднят с `host: true`, поэтому по `http://192.168.x.x:5173` с телефона API недоступно и функция «не выключать экран» молча выключена — проверять на localhost или на проде.
