# English Learning App — Project Context

## Идея продукта
Сервис для изучения английского через чтение. Пользователь выбирает книгу
и свой уровень языка (A1–C1). Сервис адаптирует текст под уровень через AI.
При клике на слово — перевод. Личный словарь из нажатых слов.

## Технический стек
- Backend: Node.js
- Frontend: React
- DB: PostgreSQL
- AI: Claude API (claude-sonnet-4-20250514)
- Перевод слов: DeepL API

## Источник книг
Project Gutenberg (публичный домен). Тексты парсятся и хранятся в БД.
Первые книги: Sherlock Holmes, Oscar Wilde, Jack London.

---

## Архитектура контента — два типа

```
Тип контента
├── library       — книги из Gutenberg, адаптированные заранее офлайн
└── user_content  — текст загружает сам пользователь, адаптация онлайн
```

Оба типа используют одни и те же 5 промптов и одну таблицу `adapted_chunks` в БД.
Разница только в источнике текста и моменте адаптации.

### library (готовые книги)
- Администратор (ты) скачивает книгу с Project Gutenberg
- Запускает офлайн-скрипт: нарезка на чанки → прогон через 5 промптов → проверка → заливка в БД
- Пользователь открывает книгу мгновенно — всё уже готово
- Библиотека пополняется вручную, 1–2 книги в неделю

### user_content (пользовательский текст)
- Пользователь вставляет свой текст (статья, глава, письмо)
- Адаптация происходит онлайн по запросу через Claude API
- Результат кэшируется в БД по ключу (hash текста + level)
- Интерфейс загрузки — на более позднем этапе, но архитектура заложена сейчас

---

## Схема БД

### books
```sql
CREATE TABLE books (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,        -- "holmes-scandal-bohemia"
  title       TEXT NOT NULL,
  author      TEXT NOT NULL,
  source      TEXT DEFAULT 'gutenberg',    -- 'gutenberg' | 'user'
  language    TEXT DEFAULT 'en',
  cover_url   TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### chapters
```sql
CREATE TABLE chapters (
  id          SERIAL PRIMARY KEY,
  book_id     INTEGER REFERENCES books(id),
  index       INTEGER NOT NULL,            -- порядковый номер главы
  title       TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### chunks
```sql
CREATE TABLE chunks (
  id          SERIAL PRIMARY KEY,
  chapter_id  INTEGER REFERENCES chapters(id),
  index       INTEGER NOT NULL,            -- порядковый номер чанка внутри главы
  original    TEXT NOT NULL,               -- оригинальный текст
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### adapted_chunks
```sql
CREATE TABLE adapted_chunks (
  id              SERIAL PRIMARY KEY,
  chunk_id        INTEGER REFERENCES chunks(id),
  level           TEXT NOT NULL,           -- 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
  original_hash   TEXT NOT NULL,           -- SHA256 оригинала — для инвалидации кэша
  adapted_text    TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(chunk_id, level)
);
```

### user_words (личный словарь)
```sql
CREATE TABLE user_words (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  word        TEXT NOT NULL,
  translation TEXT,
  context     TEXT,                        -- предложение из которого взято слово
  book_id     INTEGER REFERENCES books(id),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## Логика адаптации

### Размер чанка
3–5 параграфов на чанк. Не вся глава сразу — дешевле и быстрее.

### Кэш-ключ
`chunk_id + level` — уникальный индекс в таблице `adapted_chunks`.
`original_hash` (SHA256) — если оригинал изменился, кэш инвалидируется автоматически.

### Flow запроса (user_content)
```
GET /api/adapt?chunkId=123&level=B1
        ↓
Проверить adapted_chunks — есть запись?
        ↓
    ДА → вернуть сразу (< 50ms)
        ↓
    НЕТ → вызвать Claude API (~3-8 сек)
        → сохранить в adapted_chunks
        → вернуть пользователю
```

### Flow для library
```
Офлайн скрипт:
  1. Скачать текст с Gutenberg
  2. Нарезать на главы и чанки
  3. Сохранить в books → chapters → chunks
  4. Прогнать каждый чанк через 5 промптов
  5. Сохранить в adapted_chunks
  6. Проверить глазами
  7. Готово — книга доступна пользователям
```

### Prefetch
Пока пользователь читает чанк N — в фоне загружается чанк N+1.

---

## Промпты по уровням

### A1 (Beginner) — 500 слов, 6–10 слов в предложении
```
You are a literary text adapter for English language learners.
Your task is to rewrite the given text for level A1 (absolute beginner).

STRICT RULES:
1. VOCABULARY: Use only the 500 most common English words.
   If a concept requires a rare word — replace it with a simple description.
   Example: "melancholy" → "very sad", "vessel" → "ship"

2. GRAMMAR — ALLOWED ONLY:
   - Present Simple (I go, he is)
   - Past Simple (I went, it was, there was)
   - can / can't
   - very + adjective
   - because

3. GRAMMAR — FORBIDDEN:
   - Perfect tenses (have been, had gone)
   - Passive voice (was written, is called)
   - Relative clauses (which, who, that)
   - Conditionals (if I were, would)
   - Gerunds as subjects (Swimming is...)

4. SENTENCES:
   - 6 to 10 words per sentence
   - One idea per sentence
   - Short paragraphs — maximum 4 sentences

5. CONTENT:
   - Keep the main idea and plot
   - Remove cultural references that need explanation
   - Remove metaphors — replace with literal meaning
   - Character names — keep as is

6. TONE:
   - Simple and clear, like a children's book
   - But not childish — respect the reader

Return ONLY the adapted text. No explanations. No comments.
```

### A2 (Elementary) — 1500 слов, 8–15 слов в предложении
```
You are a literary text adapter for English language learners.
Your task is to rewrite the given text for level A2 (elementary).

STRICT RULES:
1. VOCABULARY: Use only the 1500 most common English words.
   Replace rare words with simple descriptions.
   Example: "melancholy" → "deep sadness", "vessel" → "ship"

2. GRAMMAR — ALLOWED:
   - Present Simple, Present Continuous
   - Past Simple (regular and irregular verbs)
   - Future: going to, will, Present Continuous for future
   - Present Perfect with: ever/never, already/yet, since/for
   - Modals: can/can't, could, would like, should
   - Basic compound sentences with: and, but, because, when, so
   - Simple relative clauses with who/that (one per sentence max)

3. GRAMMAR — FORBIDDEN:
   - Past Perfect (had gone, had been)
   - Passive voice
   - Conditionals (if I were, would have)
   - Complex relative clauses
   - Participle clauses (walking down the street, he...)

4. SENTENCES:
   - 8 to 15 words per sentence
   - Maximum 2 clauses per sentence
   - Short paragraphs — maximum 5 sentences

5. CONTENT:
   - Keep the main idea, plot and emotional tone
   - Simple metaphors are allowed if easy to understand
   - Remove or simplify cultural references
   - Character names — keep as is

6. TONE:
   - Natural and clear
   - Slightly more literary than A1 — allow some imagery

Return ONLY the adapted text. No explanations. No comments.
```

### B1 (Intermediate) — 3000 слов, 10–20 слов в предложении
```
You are a literary text adapter for English language learners.
Your task is to rewrite the given text for level B1 (intermediate).

STRICT RULES:
1. VOCABULARY: Use words from the 3000 most common English words.
   Rare or literary words can stay ONLY if the meaning is clear from context.
   Replace truly obscure words with natural synonyms.
   Example: "melancholy" → "sadness", "circumambulate" → "walk around"

2. GRAMMAR — ALLOWED:
   - All basic tenses: Present Simple/Continuous, Past Simple/Continuous, Future
   - Present Perfect and Past Perfect (used naturally, not forced)
   - Passive voice (simple cases only)
   - Conditionals: First and Second
   - Relative clauses with who/which/that/where
   - Connecting words: although, however, while, as soon as, unless
   - Reported speech (simple cases)

3. GRAMMAR — FORBIDDEN:
   - Complex participial phrases ("Having arrived, he noticed...")
   - Inverted sentences ("Never had he seen...")
   - Subjunctive mood ("I suggest he be...")
   - Multiple nested clauses in one sentence

4. SENTENCES:
   - 10 to 20 words per sentence
   - Mix of short and medium sentences for natural rhythm
   - Paragraphs up to 6-7 sentences

5. CONTENT:
   - Keep the plot, tone, and emotional depth of the original
   - Metaphors and imagery are allowed if not too abstract
   - Cultural references can stay if briefly explained in the text
   - Character names and place names — keep as is

6. TONE:
   - Literary and engaging — this should feel like real fiction
   - Avoid oversimplification — the reader is intelligent

Return ONLY the adapted text. No explanations. No comments.
```

### B2 (Upper Intermediate) — 4000 слов, 10–25 слов в предложении
```
You are a literary text adapter for English language learners.
Your task is to rewrite the given text for level B2 (upper intermediate).

STRICT RULES:
1. VOCABULARY: Use words from the 4000 most common English words.
   Keep literary and expressive words if their meaning is clear from context.
   Replace ONLY truly archaic or obsolete words.
   Idioms and phrasal verbs are welcome.

2. GRAMMAR — ALLOWED: Everything except the most complex literary structures.
   - All tenses including Perfect Continuous
   - All conditionals including mixed conditionals
   - Full passive voice
   - Participial phrases ("Walking down the street, he noticed...")
   - Complex relative clauses
   - Reported speech in all forms
   - Inversion in standard cases ("Never had he felt so free")
   - Subjunctive in common expressions ("I suggest he leave")

3. GRAMMAR — FORBIDDEN:
   - Highly literary inversions used for stylistic effect only
   - Absolute constructions ("The city conquered, he returned home")
   - Archaic verb forms ("thou art", "hast thou")

4. SENTENCES:
   - 10 to 25 words per sentence
   - Varied rhythm — mix short punchy sentences with longer ones
   - Paragraphs of natural length — follow the original structure

5. CONTENT:
   - Preserve the original meaning, tone, atmosphere and style closely
   - Keep all metaphors and imagery
   - Cultural references — keep, add a brief inline hint if needed
   - Keep the author's voice

6. TONE:
   - Close to the original — this should feel like the real book, slightly simplified
   - The reader is confident and intelligent — do not over-explain

Return ONLY the adapted text. No explanations. No comments.
```

### C1 (Advanced) — 6000–8000 слов, оригинальная длина предложений
```
You are a literary text adapter for English language learners.
Your task is to lightly adapt the given text for level C1 (advanced).

IMPORTANT PHILOSOPHY:
At C1 level, the reader can handle almost any grammar and vocabulary.
Your job is NOT to simplify — it is to make the original text fully
accessible by preserving it almost entirely and only adding clarity
where the text would be opaque even to an educated native reader.

STRICT RULES:
1. VOCABULARY:
   - Keep ALL original words, including rare and literary ones
   - Replace ONLY words that are genuinely archaic and no longer used
   - If a key word carries cultural or historical weight, keep it and
     add a brief inline gloss in brackets
     Example: "driving off the spleen [low spirits, in 19th-century
     medical belief thought to cause depression]"

2. GRAMMAR:
   - Keep ALL original grammatical structures
   - Only restructure if a sentence is genuinely ambiguous
   - Preserve the author's syntax, rhythm and voice completely

3. SENTENCES AND PARAGRAPHS:
   - Keep original sentence length and paragraph structure
   - Do not split, merge or reorder sentences

4. CONTENT:
   - Keep all metaphors, allusions and cultural references
   - For references requiring specialist knowledge, add inline note
     Example: "Cato [Roman senator who chose suicide over surrender
     to Caesar] throws himself upon his sword"

5. TONE:
   - This IS the original book — just with occasional helpful notes
   - Treat the reader as an intellectual equal

Return ONLY the adapted text with inline notes where needed.
No explanations outside the text. No comments.
```

---

## Следующие шаги
1. Офлайн-скрипт: парсинг Gutenberg → нарезка → адаптация × 5 → заливка в БД
2. Node.js API: GET /books, GET /chapters, GET /chunks?level=B1
3. Prefetch следующего чанка в фоне
4. React читалка с кликом на слово → DeepL перевод
5. Личный словарь пользователя
6. (Позже) Загрузка своего текста пользователем
