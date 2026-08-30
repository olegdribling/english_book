# Файловая структура проекта

> Файл обновляется при каждом создании нового файла или папки.

```text
english_book/
│
├── server.js                        — Express-сервер: все API эндпоинты, раздача фронтенда в продакшне
├── STRUCTURE.md                     — этот файл: схема файловой структуры проекта
├── CLAUDE.md                        — правила проекта для Claude: язык, git, команды, архитектура
├── CONTEXT.md                       — общее описание проекта (устаревшее, оставлено как справка)
│
├── .env                             — секретные ключи: DEEPL_API_KEY (не в git)
├── .env.example                     — пример файла .env (ANTHROPIC_API_KEY и CLAUDE_MODEL в коде не используются)
├── .gitignore                       — что не попадает в git (node_modules, .env, dist, .claude, library)
├── render.yaml                      — конфиг Render (не используется — хостинг переехал на Hostinger)
├── package.json                     — зависимости бэкенда (express, dotenv) и скрипты build/start
│
├── .claude/                         — локальные файлы Claude Code (не в git)
│   ├── settings.local.json          — локальные разрешения Claude Code
│   └── englishpod_notes.md          — подробные заметки по разделу EnglishPod
│
├── scripts/
│   ├── pdf_to_html.py               — Python-скрипт: конвертирует PDF уроков EnglishPod в HTML
│   │                                   (удаляет хедер со 2-й страницы, футер со всех; pip install pymupdf)
│   └── renumber_lessons.py          — Python-скрипт: перенумеровывает папки уроков в 001, 002, 003...
│                                       (по умолчанию dry-run, реальное переименование — с флагом --apply)
│
├── library/                         — все книги по уровням (НЕ в git, заливается по SFTP)
│   ├── A1/                          — книги уровня A1
│   ├── A2/                          — книги уровня A2
│   ├── B1/                          — книги уровня B1
│   ├── B1+/                         — книги уровня B1+
│   ├── B2/                          — книги уровня B2
│   ├── B2+/                         — книги уровня B2+
│   ├── C1/                          — книги уровня C1 (оригинальные тексты)
│   │   └── Автор/
│   │       └── Название/
│   │           ├── книга.txt        — текст книги
│   │           ├── обложка.jpg      — обложка книги
│   │           ├── книга.mp3        — озвучка книги (опционально)
│   │           └── *_about.txt      — описание книги для BookSheet (опционально)
│   └── EnglishPod/                  — полный курс EnglishPod (MP3 + PDF уроки)
│       ├── Elementary/              — уровень Elementary
│       ├── Intermediatle/           — уровень Intermediate (опечатка в имени папки — используется as-is)
│       ├── Upper Intermediatly/     — уровень Upper Intermediate (опечатка — используется as-is)
│       └── Advanced/                — уровень Advanced
│           └── NNN-Level-Title/     — папка урока (например: 001-Elementary-Difficult Customer)
│               ├── *.pdf            — PDF с диалогами урока
│               ├── *.html           — текст урока, результат работы pdf_to_html.py
│               ├── *Dialogue*.mp3   — аудио: диалог
│               ├── *Lesson Review*.mp3 — аудио: обзор урока
│               └── *.mp3            — аудио: полный урок
│
└── frontend/                        — React-приложение (Vite)
    │
    ├── index.html                   — точка входа HTML, регистрирует Service Worker
    ├── vite.config.js               — настройки Vite: порт 5173, proxy /api, /covers, /englishpod-files на :3001
    ├── package.json                 — зависимости фронтенда (react, react-router-dom, lucide-react)
    ├── eslint.config.js             — настройки линтера
    ├── README.md                    — дефолтный README шаблона Vite (не редактировался)
    ├── dist/                        — продакшн-сборка Vite (не в git)
    │
    ├── public/
    │   ├── favicon.svg              — иконка вкладки браузера
    │   ├── icons.svg                — SVG-спрайт иконок навигации
    │   ├── icon.svg                 — иконка приложения (книга) для PWA
    │   ├── icon-192.png             — иконка PWA 192×192 (Android)
    │   ├── icon-512.png             — иконка PWA 512×512 (Android)
    │   ├── apple-touch-icon.png     — иконка для iOS (добавить на рабочий стол)
    │   ├── manifest.json            — манифест PWA: название, цвета, иконки, режим standalone
    │   └── sw.js                    — минимальный Service Worker: нужен только для PWA install prompt
    │
    └── src/
        │
        ├── main.jsx                 — точка входа React: рендерит <App />
        ├── App.jsx                  — корневой компонент: роутинг, общий layout (Nav + Header + страница)
        ├── App.css                  — глобальные стили: layout с фиксированной высотой, CSS-переменные
        ├── index.css                — базовый сброс стилей и шрифты
        │
        ├── assets/
        │   ├── hero.png             — изображение-заглушка (не используется)
        │   └── vite.svg             — логотип Vite из шаблона (не используется)
        │
        ├── components/              — переиспользуемые компоненты
        │   ├── Nav.jsx              — нижняя навигация (4 иконки: Library, EnglishPod, Dictionary, Settings)
        │   ├── Nav.module.css       — стили нижней навигации
        │   ├── Header.jsx           — верхняя шапка с названием текущего раздела
        │   ├── Header.module.css    — стили шапки
        │   ├── BookCard.jsx              — карточка книги: обложка, название, автор (кнопка → onSelect)
        │   ├── BookCard.module.css       — стили карточки книги
        │   ├── BookSheet.jsx             — bottom sheet: детали книги, описание, кнопка Читать/Продолжить
        │   ├── BookSheet.module.css      — стили bottom sheet
        │   ├── TranslationPopup.jsx      — попап с переводом слова/фразы, транскрипцией, озвучкой и сохранением в словарь
        │   ├── TranslationPopup.module.css — стили попапа перевода
        │   ├── BookPageFlip.jsx          — постраничный рендер текста с 3D-анимацией перелистывания книги
        │   ├── BookPageFlip.module.css   — стили и CSS-анимации перелистывания (rotateY, perspective)
        │   ├── AddWordModal.jsx          — модальное окно ручного добавления слова в словарь (EN↔RU, автоперевод)
        │   └── AddWordModal.module.css   — стили модального окна добавления слова
        │
        ├── hooks/                        — кастомные React-хуки
        │   ├── useWordInteraction.js     — перехватывает выделение текста (двойной тап / долгий тап / мышь), вызывает onWord()
        │   ├── useFontSize.js            — хранит размер шрифта читалки в localStorage
        │   ├── useSavedWords.js          — хранит сохранённые слова словаря в localStorage
        │   ├── useSwipeNavSetting.js     — хранит настройку "навигация свайпом" в localStorage
        │   ├── useSwipeNav.js            — вешает touch-слушатели на document для свайп-навигации по главам
        │   ├── usePageNumbers.js         — хранит настройку "показывать нумерацию страниц" в localStorage
        │   ├── useKeepAwakeSetting.js    — хранит настройку "не выключать экран во время чтения" в localStorage
        │   ├── useKeepAwake.js           — держит экран включённым через Screen Wake Lock API (нужен HTTPS)
        │   ├── useBookLevel.js           — уровни и их цвета (LEVEL_COLORS), хранит выбранный уровень per-книга в localStorage
        │   ├── useBgColor.js             — хранит цвет фона читалки, применяет CSS-переменную --bg
        │   ├── useTextColor.js           — хранит цвет текста читалки, применяет CSS-переменную --text-primary
        │   ├── usePaginate.js            — разбивает текст главы на страницы по высоте контейнера
        │   └── useActiveBooks.js         — собирает список активно читаемых книг из localStorage, отсортированы по времени
        │
        └── pages/                   — страницы приложения
            ├── Library.jsx          — главная страница: табы уровней и список книг полкой
            ├── Library.module.css   — стили страницы библиотеки
            ├── InProgress.jsx       — страница "In Progress": активно читаемые книги, отсортированы по времени
            ├── InProgress.module.css — стили страницы "In Progress"
            ├── BookToc.jsx          — оглавление книги: список глав со ссылками
            ├── BookToc.module.css   — стили страницы оглавления
            ├── Reader.jsx           — читалка: текст главы, аудиоплеер, fullscreen, навигация между главами
            ├── Reader.module.css    — стили читалки
            ├── EnglishPod.jsx       — раздел EnglishPod: табы уровней и список уроков
            ├── EnglishPod.module.css — стили раздела EnglishPod
            ├── EnglishPodLesson.jsx  — страница урока: HTML-текст урока + 3 аудиоплеера
            ├── EnglishPodLesson.module.css — стили страницы урока
            ├── Dictionary.jsx       — страница словаря: flip-карточки сохранённых слов + FAB добавления
            ├── Dictionary.module.css — стили сетки карточек и CSS flip-анимации
            ├── Settings.jsx         — страница настроек: шрифт, цвета, свайп-навигация, нумерация страниц
            ├── Settings.module.css  — стили страницы настроек
            └── Audio.jsx            — старая пустая заглушка вкладки Audio (не подключена к роутингу)
```
