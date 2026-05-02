import 'dotenv/config';
import express from 'express';
import { readdir, readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Директория с книгами: на сервере хранится вне git-папки чтобы деплой не удалял файлы
const LIBRARY_DIR = process.env.LIBRARY_DIR || join(__dirname, 'library');

// Директория EnglishPod: на сервере хранится вне git-папки чтобы деплой не удалял файлы
const ENGLISHPOD_DIR = process.env.ENGLISHPOD_DIR || join(__dirname, 'library', 'EnglishPod');

// Все уровни сложности — папки внутри library/
const LEVELS = ['A1', 'A2', 'B1', 'B1+', 'B2', 'B2+', 'C1'];

// Расширения файлов обложек
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const app = express();
const PORT = process.env.PORT || 3001;

// Статика: обложки из library/
app.use('/covers', express.static(LIBRARY_DIR));

// Статика: MP3 и PDF файлы EnglishPod
app.use('/englishpod-files', express.static(ENGLISHPOD_DIR));

// В продакшне отдаём собранный фронтенд
const distDir = join(__dirname, 'frontend', 'dist');
if (process.env.NODE_ENV === 'production') {
  console.log('[production] __dirname:', __dirname);
  console.log('[production] distDir:', distDir);
  console.log('[production] dist exists:', existsSync(distDir));
  console.log('[production] index.html exists:', existsSync(join(distDir, 'index.html')));
  app.use(express.static(distDir));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Ищем .txt файл в указанной директории
async function findTxtInDir(dir) {
  try {
    const files = await readdir(dir);
    const txt = files.find(f => f.endsWith('.txt'));
    return txt ? join(dir, txt) : null;
  } catch {
    return null;
  }
}

// Ищем файл книги: library/{level}/{author}/{title}/
async function findBookFileForLevel(author, title, level) {
  return findTxtInDir(join(LIBRARY_DIR, level, author, title));
}

// Конвертер арабских чисел в римские
function toRoman(n) {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

// Парсим оглавление из текста книги.
// Поддерживает два формата:
//   Формат A: "CHAPTER I.     Down the Rabbit-Hole"  (Alice)
//   Формат B: "     Mowgli's Brothers"               (Jungle Book — просто название)
// В формате B автоматически добавляем "CHAPTER I", "CHAPTER II" и т.д.
function parseToc(text) {
  const contentsRe = /\bContents\b[^\n]*\n([\s\S]*?)(?:\n{3,})/i;
  const match = contentsRe.exec(text);
  if (!match) return [];

  const lines = match[1].split('\n').map(l => l.trim()).filter(Boolean);
  const chapters = [];
  let formatBCount = 0;

  for (const line of lines) {
    // Формат A: "CHAPTER I.   Title" или "CHAPTER 1.   Title"
    const mA = /^(CHAPTER\s+[IVXLCDM\d]+\.?)\s{2,}(.+)$/i.exec(line);
    if (mA) {
      chapters.push({ label: mA[1].trim(), title: mA[2].trim() });
      continue;
    }

    // Формат B: просто название главы
    if (line.length >= 4) {
      formatBCount++;
      chapters.push({ label: null, title: line, _bIndex: formatBCount });
    }
  }

  // Если все записи формата B — назначаем CHAPTER I, II, III...
  // searchKey хранит что реально искать в тексте файла
  if (chapters.every(ch => ch.label === null)) {
    chapters.forEach(ch => {
      ch.label     = `CHAPTER ${toRoman(ch._bIndex)}`;
      ch.searchKey = ch.title; // в файле нет "CHAPTER I", ищем по названию
    });
  } else {
    chapters.forEach(ch => {
      ch.searchKey = ch.label; // в файле есть "CHAPTER I.", ищем по нему
    });
  }

  chapters.forEach(ch => delete ch._bIndex);

  return chapters;
}

// Вырезаем текст одной главы из книги
function extractChapter(text, chapter, nextChapter) {
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const searchKey = chapter.searchKey;
  const startRe = new RegExp(`^${escape(searchKey)}\\s*$`, 'm');
  const startMatch = startRe.exec(text);
  if (!startMatch) return null;

  let end = text.length;
  if (nextChapter) {
    const nextKey = nextChapter.searchKey;
    const endRe = new RegExp(`^${escape(nextKey)}\\s*$`, 'm');
    const endMatch = endRe.exec(text.slice(startMatch.index + searchKey.length));
    if (endMatch) end = startMatch.index + searchKey.length + endMatch.index;
  }

  return text.slice(startMatch.index, end).trim();
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Читаем книги из одной директории и возвращаем массив объектов { title, author, coverUrl, audioUrl }
// getAssets — функция которая по author+title возвращает { coverUrl, audioUrl }
async function readBooksFromDir(baseDir, getAssets) {
  const books = [];
  let authors;
  try { authors = await readdir(baseDir); } catch { return books; }

  for (const author of authors) {
    const authorPath = join(baseDir, author);
    try {
      if (!(await stat(authorPath)).isDirectory()) continue;
    } catch { continue; }

    let titles;
    try { titles = await readdir(authorPath); } catch { continue; }

    for (const title of titles) {
      const bookPath = join(authorPath, title);
      try {
        if (!(await stat(bookPath)).isDirectory()) continue;
        const assets = await getAssets(author, title, bookPath);
        books.push({ title, author, ...assets });
      } catch (err) {
        console.error(`[library] skip ${author}/${title}:`, err.message);
      }
    }
  }
  return books;
}

// Ищем обложку, MP3-озвучку и файл описания (*_about.txt) в папке книги
// level — подпапка внутри library/ (A1, B2, C1 и т.д.)
async function findBookAssets(author, title, bookPath, level) {
  let files;
  try { files = await readdir(bookPath); } catch { return { coverUrl: null, audioUrl: null, about: null }; }
  const coverFile = files.find(f => IMAGE_EXTS.has(extname(f).toLowerCase()));
  const audioFile = files.find(f => f.toLowerCase().endsWith('.mp3'));
  const aboutFile = files.find(f => f.toLowerCase().endsWith('_about.txt'));
  const levelPart = `${encodeURIComponent(level)}/`;
  const base = `/covers/${levelPart}${encodeURIComponent(author)}/${encodeURIComponent(title)}/`;

  let about = null;
  if (aboutFile) {
    try { about = (await readFile(join(bookPath, aboutFile), 'utf8')).trim(); } catch { /* игнорируем */ }
  }

  return {
    coverUrl: coverFile ? base + encodeURIComponent(coverFile) : null,
    audioUrl: audioFile ? base + encodeURIComponent(audioFile) : null,
    about,
  };
}

// Собираем все книги из library/{LEVEL}/ по каждому уровню
async function readAllBooks() {
  const books = [];

  for (const level of LEVELS) {
    const levelDir = join(LIBRARY_DIR, level);
    const levelBooks = await readBooksFromDir(
      levelDir,
      (author, title, bookPath) => findBookAssets(author, title, bookPath, level)
    );
    levelBooks.forEach(b => books.push({ ...b, level }));
  }

  return books;
}

// GET /api/books — список всех книг из всех уровневых папок
app.get('/api/books', async (_req, res) => {
  try {
    const books = await readAllBooks();
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read library' });
  }
});

// GET /api/books/:author/:title/toc?level=B1
app.get('/api/books/:author/:title/toc', async (req, res) => {
  try {
    const { author, title } = req.params;
    const level    = req.query.level || 'C1';
    const filePath = await findBookFileForLevel(author, title, level);
    if (!filePath) return res.status(404).json({ error: 'Book file not found' });

    const text = await readFile(filePath, 'utf8');
    const chapters = parseToc(text);

    // Если оглавление не найдено — весь текст как одна глава
    if (chapters.length === 0) {
      return res.json({ title, author, chapters: [{ label: null, title, searchKey: null }], noToc: true });
    }

    res.json({ title, author, chapters });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to parse TOC' });
  }
});

// GET /api/books/:author/:title/chapter/:index?level=B1
app.get('/api/books/:author/:title/chapter/:index', async (req, res) => {
  try {
    const { author, title } = req.params;
    const index = parseInt(req.params.index, 10);
    const level = req.query.level || 'C1';

    const filePath = await findBookFileForLevel(author, title, level);
    if (!filePath) return res.status(404).json({ error: 'Book file not found' });

    const text = await readFile(filePath, 'utf8');
    const chapters = parseToc(text);

    // Если оглавление не найдено — весь текст как единственная глава
    if (chapters.length === 0) {
      if (index !== 0) return res.status(404).json({ error: 'Chapter not found' });
      const bookDir = join(LIBRARY_DIR, level, author, title);
      const { audioUrl } = await findBookAssets(author, title, bookDir, level);
      return res.json({ index: 0, label: null, title, text, total: 1, audioUrl });
    }

    if (index < 0 || index >= chapters.length) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    const chapter = chapters[index];
    const nextChapter = chapters[index + 1];
    const chapterText = extractChapter(text, chapter, nextChapter);

    // Ищем MP3-озвучку в папке книги
    const bookDir = join(LIBRARY_DIR, level, author, title);
    const { audioUrl } = await findBookAssets(author, title, bookDir, level);

    res.json({
      index,
      label: chapter.label,
      title: chapter.title,
      text: chapterText,
      total: chapters.length,
      audioUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to extract chapter' });
  }
});

// ── Translation ───────────────────────────────────────────────────────────────

// Кэш в памяти: "word:targetLang" → "перевод"
const translationCache = new Map();

// GET /api/translate?word=hello&to=RU
app.get('/api/translate', async (req, res) => {
  const { word, to = 'RU', from = 'EN' } = req.query;
  if (!word) return res.status(400).json({ error: 'word is required' });

  const clean = word.trim().toLowerCase();
  const cacheKey = `${clean}:${from}:${to}`;
  if (translationCache.has(cacheKey)) {
    return res.json({ word, translation: translationCache.get(cacheKey) });
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'DEEPL_API_KEY not set' });

  // Free keys заканчиваются на :fx
  const baseUrl = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [word], source_lang: from, target_lang: to }),
    });

    const data = await response.json();
    const translation = data.translations?.[0]?.text ?? '—';
    translationCache.set(cacheKey, translation);
    res.json({ word, translation });
  } catch (err) {
    console.error('DeepL error:', err.message);
    res.status(502).json({ error: 'Translation failed' });
  }
});

// ── Word Info ─────────────────────────────────────────────────────────────────

// Кэш в памяти: слово → { phonetic, audioUrl }
const wordInfoCache = new Map();

// GET /api/word-info?word=hello
// Возвращает транскрипцию и ссылку на аудио произношения через Free Dictionary API
app.get('/api/word-info', async (req, res) => {
  const { word } = req.query;
  if (!word) return res.status(400).json({ error: 'word is required' });

  const clean = word.trim().toLowerCase();
  if (wordInfoCache.has(clean)) {
    return res.json(wordInfoCache.get(clean));
  }

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`
    );

    if (!response.ok) {
      const empty = { phonetic: null, audioUrl: null };
      wordInfoCache.set(clean, empty);
      return res.json(empty);
    }

    const data = await response.json();
    const entry = data[0];

    // Ищем транскрипцию и аудио — берём первый вариант у которого есть аудио
    const phonetics = entry?.phonetics ?? [];
    const withAudio = phonetics.find(p => p.audio);
    const phonetic  = withAudio?.text ?? entry?.phonetic ?? null;
    const audioUrl  = withAudio?.audio ?? null;

    const result = { phonetic, audioUrl };
    wordInfoCache.set(clean, result);
    res.json(result);
  } catch (err) {
    console.error('Dictionary API error:', err.message);
    res.json({ phonetic: null, audioUrl: null });
  }
});

// ── EnglishPod ────────────────────────────────────────────────────────────────

// Парсим имя папки урока: "001-Elementary-Difficult Customer" → { number, title }
function parseLessonFolder(folder) {
  const parts = folder.split('-');
  const number = parts[0];
  const title  = parts.slice(2).join('-').trim();
  return { number, title };
}

// Определяем метку трека по имени файла
function audioLabel(filename) {
  if (filename.includes('Dialogue'))     return 'Dialogue';
  if (filename.includes('Lesson Review')) return 'Lesson Review';
  return 'Full Lesson';
}

// GET /api/englishpod — список всех уроков сгруппированных по уровням
app.get('/api/englishpod', async (_req, res) => {
  try {
    const result = {};
    const levels = await readdir(ENGLISHPOD_DIR);
    for (const level of levels) {
      const levelPath = join(ENGLISHPOD_DIR, level);
      if (!(await stat(levelPath)).isDirectory()) continue;
      const folders = (await readdir(levelPath)).sort();
      result[level] = folders
        .filter(f => !f.startsWith('.'))
        .map(folder => ({ folder, ...parseLessonFolder(folder) }));
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read EnglishPod' });
  }
});

// GET /api/englishpod/:level/:folder — PDF и аудио конкретного урока
app.get('/api/englishpod/:level/:folder', async (req, res) => {
  try {
    const { level, folder } = req.params;
    const lessonPath = join(ENGLISHPOD_DIR, level, folder);
    const files = await readdir(lessonPath);

    const pdf   = files.find(f => f.toLowerCase().endsWith('.pdf')) || null;
    // HTML-версия текста (результат конвертации скриптом pdf_to_html.py)
    const html  = files.find(f => f.toLowerCase().endsWith('.html')) || null;
    const audio = files
      .filter(f => f.toLowerCase().endsWith('.mp3'))
      .map(f => ({ file: f, label: audioLabel(f) }));

    res.json({ pdf, html, audio });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ error: 'Lesson not found' });
    console.error(err);
    res.status(500).json({ error: 'Failed to read lesson' });
  }
});

// SPA fallback — все неизвестные роуты отдают index.html
if (process.env.NODE_ENV === 'production') {
  app.get('*path', (req, res) => {
    res.sendFile(join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
