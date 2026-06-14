import { useEffect, useState } from 'react';

// Хук для получения списка активно читаемых книг из localStorage
// Отсортированы по времени последнего открытия (свежие первыми)
export function useActiveBooks() {
  const [activeBooks, setActiveBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // 1. Найти все ключи lastRead:* в localStorage
        const progressKeys = Object.keys(localStorage)
          .filter(k => k.startsWith('lastRead:'));

        if (progressKeys.length === 0) {
          setActiveBooks([]);
          setLoading(false);
          return;
        }

        // 2. Распарсить каждый ключ: "lastRead:Author/Title:Level"
        const entries = progressKeys.map(key => {
          const content = key.substring('lastRead:'.length); // "Author/Title:Level"
          const lastColon = content.lastIndexOf(':');
          const level = content.substring(lastColon + 1);
          const bookPath = content.substring(0, lastColon);

          // Разделить Author/Title — считаем что это последний /
          const lastSlash = bookPath.lastIndexOf('/');
          const author = bookPath.substring(0, lastSlash);
          const title = bookPath.substring(lastSlash + 1);

          // Получить timestamp из localStorage
          const timestampKey = `lastRead_ts:${author}/${title}:${level}`;
          const timestamp = parseInt(localStorage.getItem(timestampKey) || '0', 10);

          return { author, title, level, timestamp };
        });

        // 3. Получить все книги из API
        const response = await fetch('/api/books');
        if (!response.ok) throw new Error('Failed to fetch books');
        const allBooks = await response.json();

        // 4. Regex для удаления суффикса уровня из API title
        const LEVEL_SUFFIX_RE = /_([AB][12]|C1)$/;

        // 5. Найти matching книги и собрать полные данные
        const active = entries
          .map(({ author, title, level, timestamp }) => {
            // Найти книгу где автор совпадает и название совпадает
            // (с учётом что в API может быть суффикс уровня)
            const bookRecord = allBooks.find(b =>
              b.author === author &&
              b.title.replace(LEVEL_SUFFIX_RE, '') === title
            );

            if (!bookRecord) return null;

            return { ...bookRecord, level, timestamp };
          })
          .filter(Boolean);

        // 6. Отсортировать по timestamp DESC (самые свежие первыми)
        active.sort((a, b) => b.timestamp - a.timestamp);

        setActiveBooks(active);
        setLoading(false);

      } catch (err) {
        console.error('Error loading active books:', err);
        setError(err.message);
        setLoading(false);
      }
    })();
  }, []);

  return { activeBooks, loading, error };
}
