# Файловая структура проекта

> Файл обновляется при каждом создании нового файла или папки.

```text
english_book/
│
├── server.js                        — Express-сервер: все API эндпоинты, раздача фронтенда в продакшне
├── STRUCTURE.md                     — этот файл: схема файловой структуры проекта
├── CLAUDE.md                        — правила проекта для Claude: язык, git, код, стек
├── CONTEXT.md                       — общее описание проекта (устаревшее, оставлено как справка)
│
├── .env                             — секретные ключи: GROQ_API_KEY, DEEPL_API_KEY (не в git)
├── .env.example                     — пример файла .env без реальных ключей
├── .gitignore                       — что не попадает в git (node_modules, .env, dist, level_lib)
├── render.yaml                      — конфиг Render (игнорируется — сервис создан вручную)
├── package.json                     — зависимости бэкенда (express, dotenv)
│
├── scripts/
│   └── pdf_to_html.py               — Python-скрипт: конвертирует PDF уроков EnglishPod в HTML
│                                       (удаляет хедер со 2-й страницы, футер со всех; pip install pymupdf)
│
├── library/                         — все книги по уровням (в git)
│   ├── A1/                          — книги уровня A1
│   ├── A2/                          — книги уровня A2
│   ├── B1/                          — книги уровня B1
│   ├── B2/                          — книги уровня B2
│   ├── C1/                          — книги уровня C1 (оригинальные тексты)
│   │   └── Автор/
│   │       └── Название/
│   │           ├── книга.txt        — текст книги
│   │           └── обложка.jpg      — обложка книги
│   └── EnglishPod/                  — полный курс EnglishPod (MP3 + PDF уроки)
│       ├── Elementary/              — уровень Elementary
│       ├── Intermediatle/           — уровень Intermediate
│       ├── Upper Intermediatly/     — уровень Upper Intermediate
│       └── Advanced/                — уровень Advanced
│           └── NNN-Level-Title/     — папка урока (например: 001-Elementary-Difficult Customer)
│               ├── *.pdf            — PDF с диалогами урока
│               ├── *Dialogue*.mp3   — аудио: диалог
│               ├── *Lesson Review*.mp3 — аудио: обзор урока
│               └── *.mp3            — аудио: полный урок
│
└── frontend/                        — React-приложение (Vite)
    │
    ├── index.html                   — точка входа HTML
    ├── vite.config.js               — настройки Vite: порт 5173, proxy /api и /covers на :3001
    ├── package.json                 — зависимости фронтенда (react, react-router-dom, lucide-react)
    ├── eslint.config.js             — настройки линтера
    │
    ├── public/
    │   ├── favicon.svg              — иконка вкладки браузера
    │   └── icons.svg                — SVG-спрайт иконок навигации
    │
    └── src/
        │
        ├── main.jsx                 — точка входа React: рендерит <App />
        ├── App.jsx                  — корневой компонент: роутинг, общий layout (Nav + Header + страница)
        ├── App.css                  — глобальные стили: layout с фиксированной высотой, CSS-переменные
        ├── index.css                — базовый сброс стилей и шрифты
        │
        ├── assets/
        │   └── hero.png             — изображение-заглушка (не используется)
        │
        ├── components/              — переиспользуемые компоненты
        │   ├── Nav.jsx              — нижняя навигация (4 иконки: Library, EnglishPod, Dictionary, Settings)
        │   ├── Nav.module.css       — стили нижней навигации
        │   ├── Header.jsx           — верхняя шапка с названием текущего раздела
        │   ├── Header.module.css    — стили шапки
        │   ├── BookCard.jsx              — карточка книги: обложка, название, автор (кнопка → onSelect)
        │   ├── BookCard.module.css       — стили карточки книги
        │   ├── BookSheet.jsx             — bottom sheet: детали книги, кнопка Читать/Продолжить
        │   ├── BookSheet.module.css      — стили bottom sheet
        │   ├── TranslationPopup.jsx      — попап с переводом слова над выделенным текстом
        │   ├── TranslationPopup.module.css — стили попапа перевода
        │   ├── BookPageFlip.jsx          — постраничный рендер текста с 3D-анимацией перелистывания книги
        │   └── BookPageFlip.module.css   — стили и CSS-анимации перелистывания (rotateY, perspective)
        │
        ├── hooks/                        — кастомные React-хуки
        │   ├── useWordInteraction.js     — перехватывает выделение текста (тап/мышь), вызывает onWord()
        │   ├── useFontSize.js            — хранит размер шрифта читалки в localStorage
        │   ├── useTranslateLine.js       — хранит настройку "переводить строку целиком" в localStorage
        │   ├── useSwipeNavSetting.js     — хранит настройку "навигация свайпом" в localStorage
        │   ├── useSwipeNav.js            — вешает touch-слушатели на document для свайп-навигации по главам
        │   ├── usePageNumbers.js         — хранит настройку "показывать нумерацию страниц" в localStorage
        │   ├── useBookLevel.js           — хранит выбранный уровень сложности per-книга в localStorage
        │   ├── useBgColor.js             — хранит цвет фона читалки, применяет CSS-переменную --bg
        │   ├── useTextColor.js           — хранит цвет текста читалки, применяет CSS-переменную --text-primary
        │   └── usePaginate.js            — разбивает текст главы на страницы по высоте контейнера
        │
        └── pages/                   — страницы приложения
            ├── Library.jsx          — главная страница: список книг полкой
            ├── Library.module.css   — стили страницы библиотеки
            ├── BookToc.jsx          — оглавление книги: список глав со ссылками
            ├── BookToc.module.css   — стили страницы оглавления
            ├── Reader.jsx           — читалка: отображает текст главы, навигация между главами
            ├── Reader.module.css    — стили читалки
            ├── EnglishPod.jsx       — раздел EnglishPod: табы уровней и список уроков
            ├── EnglishPod.module.css — стили раздела EnglishPod
            ├── EnglishPodLesson.jsx  — страница урока: PDF iframe + 3 аудиоплеера
            ├── EnglishPodLesson.module.css — стили страницы урока
            ├── Dictionary.jsx       — страница словаря (заглушка)
            ├── Settings.jsx         — страница настроек: размер шрифта, режим перевода строки, свайп-навигация
            └── Settings.module.css  — стили страницы настроек
```
