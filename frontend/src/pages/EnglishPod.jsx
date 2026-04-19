import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EnglishPod.module.css';

// Ключ для сохранения активного уровня между переходами
const LEVEL_KEY = 'englishpodLevel';

// Порядок и отображаемые метки для папок уровней (в папках есть опечатки)
const LEVEL_ORDER = ['Elementary', 'Intermediatle', 'Upper Intermediatly', 'Advanced'];
const LEVEL_LABEL = {
  'Elementary':          'Elementary',
  'Intermediatle':       'Intermediate',
  'Upper Intermediatly': 'Upper Int.',
  'Advanced':            'Advanced',
};

export default function EnglishPod() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [activeLevel, setActiveLevel] = useState(
    () => sessionStorage.getItem(LEVEL_KEY) || ''
  );
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/englishpod')
      .then(r => r.json())
      .then(json => {
        setData(json);
        // Устанавливаем первый уровень если ещё не выбран
        const levels = Object.keys(json);
        if (!activeLevel && levels.length > 0) {
          setActiveLevel(levels[0]);
        }
        setLoading(false);
      })
      .catch(() => { setError('Could not load EnglishPod'); setLoading(false); });
  }, []);

  // Сохраняем выбранный уровень
  function selectLevel(level) {
    setActiveLevel(level);
    sessionStorage.setItem(LEVEL_KEY, level);
  }

  if (loading) return <div className={styles.center}><p className={styles.hint}>Loading...</p></div>;
  if (error)   return <div className={styles.center}><p className={styles.hint}>{error}</p></div>;

  // Сортируем уровни в правильном порядке, игнорируем отсутствующие папки
  const levels = LEVEL_ORDER.filter(l => data[l] !== undefined);
  const lessons = data[activeLevel] || [];

  return (
    <div className={styles.page}>
      {/* Табы уровней */}
      <div className={styles.tabs}>
        {levels.map(level => (
          <button
            key={level}
            className={`${styles.tab} ${activeLevel === level ? styles.tabActive : ''}`}
            onClick={() => selectLevel(level)}
          >
            {LEVEL_LABEL[level] ?? level}
          </button>
        ))}
      </div>

      {/* Список уроков */}
      <ul className={styles.list}>
        {lessons.map(({ folder, number, title }) => (
          <li key={folder}>
            <button
              className={styles.lesson}
              onClick={() => navigate(`/englishpod/${encodeURIComponent(activeLevel)}/${encodeURIComponent(folder)}`)}
            >
              <span className={styles.number}>{number}</span>
              <span className={styles.title}>{title}</span>
              <span className={styles.arrow}>›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
