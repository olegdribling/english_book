import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { Volume2, Plus, Check } from 'lucide-react';
import { saveWord, isWordSaved } from '../hooks/useSavedWords';
import styles from './TranslationPopup.module.css';

// Попап с переводом слова — появляется над/под выделенным словом.
// Показывает: кнопку сохранения, оригинал, транскрипцию, кнопку озвучки и перевод.
// rects — массив прямоугольников выделения для подсветки (каждая строка отдельно)
export default function TranslationPopup({ word, rect, rects, onClose }) {
  const [translation, setTranslation] = useState(null);
  const [phonetic, setPhonetic]       = useState(null);
  const [audioUrl, setAudioUrl]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [saved, setSaved]             = useState(() => isWordSaved(word));
  const audioRef = useRef(null);
  const popupRef = useRef(null);
  const arrowRef = useRef(null);

  const isPhrase = word ? word.includes(' ') : false;

  // Запрашиваем перевод и информацию о слове независимо друг от друга
  useEffect(() => {
    if (!word) return;
    setLoading(true);
    setTranslation(null);
    setPhonetic(null);
    setAudioUrl(null);

    fetch(`/api/translate?word=${encodeURIComponent(word)}&to=RU`)
      .then(r => r.json())
      .then(d => { setTranslation(d.translation ?? '—'); setLoading(false); })
      .catch(() => { setTranslation('—'); setLoading(false); });

    if (!isPhrase) {
      fetch(`/api/word-info?word=${encodeURIComponent(word)}`)
        .then(r => r.json())
        .then(d => { setPhonetic(d.phonetic ?? null); setAudioUrl(d.audioUrl ?? null); })
        .catch(() => {});
    }
  }, [word, isPhrase]);

  // Корректируем позицию попапа: не выходит за края экрана.
  // Если не влезает сверху — переносим под слово и переворачиваем стрелку.
  useLayoutEffect(() => {
    const el = popupRef.current;
    if (!el) return;

    const MARGIN = 8;
    const box    = el.getBoundingClientRect();

    // Горизонтальная коррекция
    if (box.right > window.innerWidth - MARGIN) {
      el.style.left = `${parseFloat(el.style.left) - (box.right - (window.innerWidth - MARGIN))}px`;
    }
    if (box.left < MARGIN) {
      el.style.left = `${parseFloat(el.style.left) + (MARGIN - box.left)}px`;
    }

    // Если не влезает сверху — показываем снизу слова
    if (box.top < MARGIN) {
      el.style.top       = `${rect.bottom + 8}px`;
      el.style.transform = isMobile && isPhrase ? 'translateY(0)' : 'translate(-50%, 0)';
      // Переворачиваем стрелку вверх
      const arrow = arrowRef.current;
      if (arrow) {
        arrow.style.bottom   = 'auto';
        arrow.style.top      = '-6px';
        arrow.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
      }
    }
  });

  const playAudio = (e) => {
    e.stopPropagation();
    if (!audioUrl) return;
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = new Audio(audioUrl);
    audioRef.current.play();
  };

  if (!word || !rect) return null;

  const top      = rect.top - 8;
  const isMobile = window.innerWidth < 768;
  const PAGE_PAD = 16;
  const left     = Math.min(Math.max(80, rect.left + rect.width / 2), window.innerWidth - 80);

  const popupStyle = (isMobile && isPhrase)
    ? { left: PAGE_PAD, top, width: `calc(100vw - ${PAGE_PAD * 2}px)`, transform: 'translateY(-100%)' }
    : { left, top };

  // Прямоугольники для подсветки — используем переданные rects или bounding rect как fallback
  const highlightRects = rects?.length ? rects : [rect];

  return (
    <>
      {/* Подсветка каждой строки выделенного слова/предложения */}
      {highlightRects.map((r, i) => (
        <div
          key={i}
          style={{
            position:     'fixed',
            left:         r.left - 2,
            top:          r.top,
            width:        r.width + 4,
            height:       r.height,
            background:   'rgba(255, 213, 0, 0.4)',
            borderRadius: '3px',
            pointerEvents: 'none',
            zIndex:       98,
          }}
        />
      ))}

      {/* Прозрачная подложка — клик закрывает попап */}
      <div className={styles.backdrop} onPointerDown={onClose} />

      <div
        ref={popupRef}
        className={`${styles.popup} ${isPhrase ? styles.popupPhrase : ''}`}
        style={popupStyle}
      >
        <div ref={arrowRef} className={styles.arrow} />

        {isPhrase ? null : (
          /* Режим слова: [+] слово [🔊] */
          <div className={styles.header}>
            <button
              className={styles.iconBtn}
              onPointerDown={e => {
                e.stopPropagation();
                if (saved) return;
                const t = translation && translation !== '—' ? translation : null;
                saveWord(word, t);
                window.dispatchEvent(new Event('savedWordsUpdated'));
                setSaved(true);
              }}
            >
              {saved
                ? <Check size={18} strokeWidth={2} />
                : <Plus size={18} strokeWidth={2} />
              }
            </button>

            <span className={styles.word}>{word}</span>

            <button
              className={`${styles.iconBtn} ${!audioUrl ? styles.iconBtnDisabled : ''}`}
              onPointerDown={playAudio}
            >
              <Volume2 size={18} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Транскрипция и разделитель — только для слов */}
        {!isPhrase && (
          <>
            {phonetic && <p className={styles.phonetic}>{phonetic}</p>}
            <div className={styles.divider} />
          </>
        )}

        {/* Кнопка сохранения фразы в словарь */}
        {isPhrase && (
          <button
            className={styles.savePhraseBtn}
            onPointerDown={e => {
              e.stopPropagation();
              if (saved) return;
              const t = translation && translation !== '—' ? translation : null;
              saveWord(word, t);
              window.dispatchEvent(new Event('savedWordsUpdated'));
              setSaved(true);
            }}
          >
            {saved
              ? <Check size={15} strokeWidth={2} />
              : <Plus size={15} strokeWidth={2} />
            }
          </button>
        )}

        {/* Перевод */}
        <p className={styles.translation}>
          {loading ? '…' : translation}
        </p>
      </div>
    </>
  );
}
