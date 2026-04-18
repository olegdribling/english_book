import { useRef } from 'react';
import styles from './BookPageFlip.module.css';

// Рендерит массив параграфов одной страницы
function PageContent({ paragraphs }) {
  return (paragraphs ?? []).map((p, i) => <p key={i}>{p}</p>);
}

// Компонент перелистывания страниц.
// animDir:  'fwd' | 'bwd' | null
// animType: 'flip' (3D перелистывание) | 'fade' (затухание)
export default function BookPageFlip({ pages, pageIndex, animDir, animType = 'flip', onAnimEnd, fontSize }) {
  // Запоминаем индекс предыдущей страницы — нужен во время анимации
  const prevIdxRef = useRef(pageIndex);

  // Во время анимации: outIdx — уходящая страница, inIdx — входящая
  const outIdx = animDir ? prevIdxRef.current : pageIndex;
  const inIdx  = animDir ? pageIndex          : null;

  const handleAnimEnd = () => {
    prevIdxRef.current = pageIndex;
    onAnimEnd?.();
  };

  if (!pages?.length) return null;

  // ── Анимация fade: новая страница появляется поверх старой ──
  if (animType === 'fade' && animDir) {
    return (
      <div className={styles.scene} style={{ fontSize }}>
        <div className={styles.staticPage}>
          <PageContent paragraphs={pages[outIdx]} />
        </div>
        <div className={`${styles.animPage} ${styles.fadeIn}`} onAnimationEnd={handleAnimEnd}>
          <PageContent paragraphs={pages[inIdx]} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.scene} style={{ fontSize }}>

      {/* Вперёд: уходящая страница складывается влево, входящая лежит снизу */}
      {animDir === 'fwd' && <>
        <div className={styles.staticPage}>
          <PageContent paragraphs={pages[inIdx]} />
        </div>
        <div className={`${styles.animPage} ${styles.exitFwd}`} onAnimationEnd={handleAnimEnd}>
          <PageContent paragraphs={pages[outIdx]} />
        </div>
      </>}

      {/* Назад: входящая страница разворачивается сверху, уходящая лежит снизу */}
      {animDir === 'bwd' && <>
        <div className={styles.staticPage}>
          <PageContent paragraphs={pages[outIdx]} />
        </div>
        <div className={`${styles.animPage} ${styles.enterBwd}`} onAnimationEnd={handleAnimEnd}>
          <PageContent paragraphs={pages[inIdx]} />
        </div>
      </>}

      {/* Статичное состояние — анимации нет */}
      {!animDir && (
        <div className={styles.staticPage}>
          <PageContent paragraphs={pages[pageIndex]} />
        </div>
      )}

    </div>
  );
}
