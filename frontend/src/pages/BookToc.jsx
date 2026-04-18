import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import styles from './BookToc.module.css';

export default function BookToc() {
  const { author, title } = useParams();
  const [searchParams]    = useSearchParams();
  const level             = searchParams.get('level') || 'C1';
  const [toc, setToc]     = useState(null);
  const [error, setError] = useState(null);
  const navigate          = useNavigate();

  useEffect(() => {
    fetch(`/api/books/${encodeURIComponent(author)}/${encodeURIComponent(title)}/toc?level=${level}`)
      .then(r => r.json())
      .then(data => {
        // Если у книги нет оглавления — на страницу библиотеки
        if (data.noToc) {
          navigate('/', { replace: true });
        } else {
          setToc(data);
        }
      })
      .catch(() => setError('Could not load table of contents'));
  }, [author, title]);

  if (error) return <div className={styles.center}><p className={styles.hint}>{error}</p></div>;
  if (!toc)  return <div className={styles.center}><p className={styles.hint}>Loading...</p></div>;

  const base = `/book/${encodeURIComponent(author)}/${encodeURIComponent(title)}/chapter`;
  const lvlQ = `?level=${level}`;

  return (
    <div className={styles.page}>
      <p className={styles.author}>{toc.author}</p>
      <h2 className={styles.bookTitle}>{toc.title}</h2>

      <ol className={styles.list}>
        {toc.chapters.map((ch, i) => (
          <li key={i}>
            <Link to={`${base}/${i}${lvlQ}`} className={styles.chapterLink}>
              <span className={styles.label}>{ch.label}</span>
              <span className={styles.chapterTitle}>{ch.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
