import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { Volume2, Plus } from 'lucide-react';
import styles from './TranslationPopup.module.css';

// Попап с переводом слова — появляется над выделенным словом.
// Показывает: кнопку сохранения, оригинал, транскрипцию, кнопку озвучки и перевод.
export default function TranslationPopup({ word, rect, onClose }) {
  const [translation, setTranslation] = useState(null);
  const [phonetic, setPhonetic]       = useState(null);
  const [audioUrl, setAudioUrl]       = useState(null);
  const [loading, setLoading]         = useState(true);

  // Ссылка на объект Audio чтобы останавливать предыдущее воспроизведение
  const audioRef = useRef(null);
  // Ссылка на DOM-элемент попапа — для проверки выхода за края экрана
  const popupRef = useRef(null);

  const isPhrase = word ? word.includes(' ') : false;

  // Запрашиваем перевод и информацию о слове независимо друг от друга
  useEffect(() => {
    if (!word) return;
    setLoading(true);
    setTranslation(null);
    setPhonetic(null);
    setAudioUrl(null);

    // Перевод — основной запрос, показываем результат сразу как придёт
    fetch(`/api/translate?word=${encodeURIComponent(word)}&to=RU`)
      .then(r => r.json())
      .then(d => { setTranslation(d.translation ?? '—'); setLoading(false); })
      .catch(() => { setTranslation('—'); setLoading(false); });

    // Транскрипция и аудио — только для одиночных слов
    if (!isPhrase) {
      fetch(`/api/word-info?word=${encodeURIComponent(word)}`)
        .then(r => r.json())
        .then(d => { setPhonetic(d.phonetic ?? null); setAudioUrl(d.audioUrl ?? null); })
        .catch(() => {});
    }
  }, [word, isPhrase]);

  // После рендера проверяем реальные границы попапа и корректируем позицию.
  // useLayoutEffect — синхронно до отрисовки, поэтому мигания нет.
  useLayoutEffect(() => {
    const el = popupRef.current;
    if (!el) return;

    const MARGIN = 8;
    const box    = el.getBoundingClientRect();

    if (box.right > window.innerWidth - MARGIN) {
      el.style.left = `${parseFloat(el.style.left) - (box.right - (window.innerWidth - MARGIN))}px`;
    }
    if (box.left < MARGIN) {
      el.style.left = `${parseFloat(el.style.left) + (MARGIN - box.left)}px`;
    }
    if (box.top < MARGIN) {
      // Если не влезает сверху — показываем снизу слова
      el.style.top       = `${rect.bottom + 8}px`;
      el.style.transform = el.style.transform.replace('translateY(-100%)', '') || 'none';
    }
  });

  // Воспроизводим произношение слова
  const playAudio = (e) => {
    e.stopPropagation();
    if (!audioUrl) return;
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = new Audio(audioUrl);
    audioRef.current.play();
  };

  if (!word || !rect) return null;

  const top = rect.top - 8;

  // На мобайле растягиваем попап на ширину текстового блока (отступы 16px)
  const isMobile   = window.innerWidth < 768;
  const PAGE_PAD   = 16;
  const left       = Math.min(Math.max(80, rect.left + rect.width / 2), window.innerWidth - 80);
  const popupStyle = (isMobile && isPhrase)
    ? { left: PAGE_PAD, top, width: `calc(100vw - ${PAGE_PAD * 2}px)`, transform: 'translateY(-100%)' }
    : { left, top };

  return (
    <>
      {/* Прозрачная подложка — клик закрывает попап */}
      <div className={styles.backdrop} onPointerDown={onClose} />

      <div
        ref={popupRef}
        className={`${styles.popup} ${isPhrase ? styles.popupPhrase : ''}`}
        style={popupStyle}
      >
        <div className={styles.arrow} />

        {isPhrase ? null : (
          /* Режим слова: [+] слово [🔊] */
          <div className={styles.header}>
            <button className={styles.iconBtn} onPointerDown={e => e.stopPropagation()}>
              <Plus size={18} strokeWidth={2} />
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

        {/* Перевод */}
        <p className={styles.translation}>
          {loading ? '…' : translation}
        </p>
      </div>
    </>
  );
}
