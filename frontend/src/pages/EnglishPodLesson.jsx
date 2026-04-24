import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useWordInteraction } from '../hooks/useWordInteraction';
import { useFontSize } from '../hooks/useFontSize';
import TranslationPopup from '../components/TranslationPopup';
import styles from './EnglishPodLesson.module.css';

// Порядок отображения аудиодорожек
const TRACK_ORDER = ['Dialogue', 'Full Lesson', 'Lesson Review'];

// Дочерний компонент — рендерится только когда htmlContent уже загружен.
// Это гарантирует что textRef указывает на DOM когда useWordInteraction запускается,
// точно так же как ChapterContent в Reader.jsx.
function LessonText({ htmlContent }) {
  const [popup, setPopup]  = useState(null);
  const [fontSize]         = useFontSize();
  const textRef            = useRef(null);

  const onWord = useCallback((word, rect, rects) => {
    setPopup({ word, rect, rects });
  }, []);

  useWordInteraction(textRef, onWord);

  return (
    <>
      <div
        ref={textRef}
        className={styles.htmlContent}
        style={{ fontSize }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      {popup && (
        <TranslationPopup
          word={popup.word}
          rect={popup.rect}
          rects={popup.rects}
          onClose={() => setPopup(null)}
        />
      )}
    </>
  );
}

// Ключ в localStorage для хранения посещённых уроков
const VISITED_KEY = 'englishpodVisited';

export function markVisited(level, folder) {
  const raw     = localStorage.getItem(VISITED_KEY);
  const visited = raw ? JSON.parse(raw) : {};
  visited[`${level}__${folder}`] = true;
  localStorage.setItem(VISITED_KEY, JSON.stringify(visited));
}

export function getVisited() {
  const raw = localStorage.getItem(VISITED_KEY);
  return raw ? JSON.parse(raw) : {};
}

export default function EnglishPodLesson() {
  const { level, folder } = useParams();
  const [lesson, setLesson]           = useState(null);
  const [htmlContent, setHtmlContent] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  // Отмечаем урок как посещённый при открытии
  useEffect(() => { markVisited(level, folder); }, [level, folder]);

  useEffect(() => {
    const base = `/englishpod-files/${encodeURIComponent(level)}/${encodeURIComponent(folder)}`;

    fetch(`/api/englishpod/${encodeURIComponent(level)}/${encodeURIComponent(folder)}`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(async data => {
        setLesson(data);
        if (data.html) {
          const res = await fetch(`${base}/${encodeURIComponent(data.html)}`);
          if (res.ok) {
            const text  = await res.text();
            const match = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            setHtmlContent(match ? match[1] : text);
          }
        }
        setLoading(false);
      })
      .catch(() => { setError('Could not load lesson'); setLoading(false); });
  }, [level, folder]);

  if (loading) return <div className={styles.center}><p className={styles.hint}>Loading...</p></div>;
  if (error)   return <div className={styles.center}><p className={styles.hint}>{error}</p></div>;

  const base = `/englishpod-files/${encodeURIComponent(level)}/${encodeURIComponent(folder)}`;

  const sortedAudio = [...(lesson.audio || [])].sort(
    (a, b) => TRACK_ORDER.indexOf(a.label) - TRACK_ORDER.indexOf(b.label)
  );

  return (
    <div className={styles.page}>
      {htmlContent && <LessonText htmlContent={htmlContent} />}

      <div className={styles.audioList}>
        {sortedAudio.map(({ file, label }) => (
          <div key={file} className={styles.track}>
            <span className={styles.trackLabel}>{label}</span>
            <audio
              controls
              className={styles.player}
              src={`${base}/${encodeURIComponent(file)}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
