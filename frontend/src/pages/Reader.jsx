import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useWordInteraction } from '../hooks/useWordInteraction';
import { saveLevel } from '../hooks/useBookLevel';
import { useFontSize } from '../hooks/useFontSize';
import { useSwipeNavSetting } from '../hooks/useSwipeNavSetting';
import { usePageNumbers } from '../hooks/usePageNumbers';
import { useSwipeNav } from '../hooks/useSwipeNav';
import { usePaginate } from '../hooks/usePaginate';
import BookPageFlip from '../components/BookPageFlip';
import TranslationPopup from '../components/TranslationPopup';
import styles from './Reader.module.css';

// Компонент текста главы — рендерится только после загрузки данных,
// поэтому textRef гарантированно указывает на DOM-элемент когда хук запускается
function ChapterContent({ chapter, author, title, idx, level, hasAudio }) {
  const [popup, setPopup]          = useState(null);
  const [animDir, setAnimDir]      = useState(null);
  // Тип анимации: 'flip' для свайпа (мобильный), 'fade' для клика (десктоп)
  const [animType, setAnimType]    = useState('flip');
  const [fontSize]                 = useFontSize();
  const [swipeNav]                 = useSwipeNavSetting();
  const [showPageNumbers]          = usePageNumbers();
  const navigate                   = useNavigate();
  const textRef                    = useRef(null);

  const handleWord = useCallback((word, rect, rects) => {
    setPopup({ word, rect, rects });
  }, []);

  // Ключ для сохранения позиции скролла — уникальный для каждой главы
  const scrollKey = `scroll:/book/${encodeURIComponent(author)}/${encodeURIComponent(title)}/chapter/${idx}`;
  // Ключ для сохранения номера страницы в постраничном режиме
  const flipKey   = `flip:/book/${encodeURIComponent(author)}/${encodeURIComponent(title)}/chapter/${idx}`;

  // Сохраняем прогресс чтения и текущий уровень книги
  useEffect(() => {
    const originalTitle = title.replace(/_([AB][12]|C1)$/, '');
    // Индекс главы — отдельно для каждого уровня
    const progressKey = `lastRead:${author}/${originalTitle}:${level}`;
    localStorage.setItem(progressKey, String(idx));
    // Уровень книги — чтобы BookSheet при следующем открытии знал последний уровень
    saveLevel(author, originalTitle, level);
  }, [author, title, idx, level]);

  // Восстанавливаем позицию скролла (только в режиме прокрутки)
  useEffect(() => {
    if (swipeNav) return;
    const main = document.querySelector('.main');
    if (!main) return;

    const saved = localStorage.getItem(scrollKey);
    if (saved) main.scrollTop = parseInt(saved, 10);

    let timer;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.setItem(scrollKey, String(main.scrollTop));
      }, 100);
    };

    main.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, [scrollKey, swipeNav]);

  const base    = `/book/${encodeURIComponent(author)}/${encodeURIComponent(title)}/chapter`;
  const lvlQ    = `?level=${encodeURIComponent(level)}`;
  const prevUrl = idx > 0 ? `${base}/${idx - 1}${lvlQ}` : null;
  const nextUrl = idx < chapter.total - 1 ? `${base}/${idx + 1}${lvlQ}` : null;

  // Пагинация текста — вычисляется только когда включён режим перелистывания
  const savedPageIndex = swipeNav ? parseInt(localStorage.getItem(flipKey) || '0', 10) : 0;
  const { containerRef, pages, pageIndex, goNext, goPrev, isFirst, isLast, total } =
    usePaginate({ text: swipeNav ? chapter.text : '', fontSize, initialPageIndex: savedPageIndex });

  // Сохраняем текущую страницу в sessionStorage при каждом перелистывании
  useEffect(() => {
    if (!swipeNav) return;
    localStorage.setItem(flipKey, String(pageIndex));
  }, [flipKey, pageIndex, swipeNav]);

  // Взаимодействие со словами: textRef — режим прокрутки, containerRef — режим перелистывания
  // Хук безопасно игнорирует null-рефы, поэтому вызываем оба
  useWordInteraction(textRef, handleWord);
  useWordInteraction(containerRef, handleWord);

  // Клик мышью по левой/правой половине контейнера — навигация на десктопе (анимация fade)
  // pointerType === 'mouse' исключает тач-тапы, которые тоже генерируют click-событие
  const handlePageClick = useCallback((e) => {
    if (e.pointerType !== 'mouse') return;
    if (!pages) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isRightHalf = e.clientX > rect.left + rect.width / 2;
    setAnimType('fade');
    if (isRightHalf) {
      if (!isLast) { setAnimDir('fwd'); goNext(); }
      else if (nextUrl) navigate(nextUrl);
    } else {
      if (!isFirst) { setAnimDir('bwd'); goPrev(); }
      else if (prevUrl) navigate(prevUrl);
    }
  }, [pages, isFirst, isLast, goNext, goPrev, prevUrl, nextUrl, navigate]);

  // Свайп влево — следующая страница или следующая глава (анимация flip)
  const handleSwipeLeft = useCallback(() => {
    setAnimType('flip');
    if (!isLast) { setAnimDir('fwd'); goNext(); }
    else if (nextUrl) navigate(nextUrl);
  }, [isLast, goNext, nextUrl, navigate]);

  // Свайп вправо — предыдущая страница или предыдущая глава (анимация flip)
  const handleSwipeRight = useCallback(() => {
    setAnimType('flip');
    if (!isFirst) { setAnimDir('bwd'); goPrev(); }
    else if (prevUrl) navigate(prevUrl);
  }, [isFirst, goPrev, prevUrl, navigate]);

  useSwipeNav({
    enabled:      swipeNav,
    onSwipeLeft:  handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  // ── Режим постраничного перелистывания ──
  if (swipeNav) {
    return (
      <>
        <div className={styles.pagedView}>
          {showPageNumbers && <p className={styles.pagedLabel}>{chapter.label} · {chapter.title}</p>}
          <div className={styles.pagedText} ref={containerRef} onPointerUp={handlePageClick}>
            {pages
              ? <BookPageFlip
                  pages={pages}
                  pageIndex={pageIndex}
                  animDir={animDir}
                  animType={animType}
                  onAnimEnd={() => setAnimDir(null)}
                  fontSize={fontSize}
                />
              : <p className={styles.hint}>Loading…</p>
            }
          </div>
          {showPageNumbers && pages && total > 0 && (
            <p className={styles.pageCount}>{pageIndex + 1} / {total}</p>
          )}
        </div>

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

  // ── Режим прокрутки (оригинальный) ──
  return (
    <>
      <div className={styles.page} style={hasAudio ? { paddingBottom: 80 } : undefined}>
        <p className={styles.label}>{chapter.label}</p>
        <h2 className={styles.chapterTitle}>{chapter.title}</h2>

        <div className={styles.text} ref={textRef} style={{ fontSize }}>
          {chapter.text.split('\n\n').map((para, i) => (
            <p key={i}>{para.replace(/\n/g, ' ')}</p>
          ))}
        </div>

        <div className={styles.nav}>
          {idx > 0 && (
            <Link to={`${base}/${idx - 1}${lvlQ}`} className={styles.navBtn}>← Previous</Link>
          )}
          {idx < chapter.total - 1 && (
            <Link to={`${base}/${idx + 1}${lvlQ}`} className={`${styles.navBtn} ${styles.next}`}>Next →</Link>
          )}
        </div>
      </div>

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

// Страница читалки — загружает главу и передаёт данные в ChapterContent
export default function Reader() {
  const { author, title, index } = useParams();
  const [searchParams]           = useSearchParams();
  const level                    = searchParams.get('level') || 'C1';
  const [chapter, setChapter]    = useState(null);
  const [error, setError]        = useState(null);
  // audioUrl хранится на уровне Reader чтобы плеер не сбрасывался при смене глав
  const [audioUrl, setAudioUrl]  = useState(null);
  const audioRef                 = useRef(null);
  // Ключ для сохранения позиции воспроизведения в localStorage
  const audioKey                 = `audioTime:${author}/${title}`;

  useEffect(() => {
    fetch(`/api/books/${encodeURIComponent(author)}/${encodeURIComponent(title)}/chapter/${index}?level=${encodeURIComponent(level)}`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        setChapter(data);
        if (data.audioUrl) setAudioUrl(data.audioUrl);
      })
      .catch(() => setError('Could not load chapter'));
  }, [author, title, index, level]);

  // Восстанавливаем позицию воспроизведения когда аудио готово к перемотке
  const handleLoadedMetadata = useCallback(() => {
    const saved = parseFloat(localStorage.getItem(audioKey));
    if (saved && audioRef.current) audioRef.current.currentTime = saved;
  }, [audioKey]);

  // Сохраняем позицию каждые 5 секунд во время воспроизведения
  const handleTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (!el || el.paused) return;
    const now = Math.floor(el.currentTime);
    if (now % 5 === 0) localStorage.setItem(audioKey, String(el.currentTime));
  }, [audioKey]);

  if (error)    return <div className={styles.center}><p className={styles.hint}>{error}</p></div>;
  if (!chapter) return <div className={styles.center}><p className={styles.hint}>Loading...</p></div>;

  return (
    <div className={styles.readerLayout}>
      <div className={styles.readerScroll}>
        <ChapterContent chapter={chapter} author={author} title={title} idx={parseInt(index, 10)} level={level} hasAudio={false} />
      </div>
      {audioUrl && (
        <div className={styles.audioBar}>
          <audio
            ref={audioRef}
            controls
            controlsList="nodownload"
            src={audioUrl}
            className={styles.audioPlayer}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
          />
        </div>
      )}
    </div>
  );
}
