import { useState, useEffect, useRef } from 'react';
import { saveWord } from '../hooks/useSavedWords';
import styles from './AddWordModal.module.css';

// Определяем язык текста по наличию кириллицы
function detectLang(text) {
  return /[а-яА-ЯёЁ]/.test(text) ? 'RU' : 'EN';
}

// Модальное окно ручного добавления слова в словарь с автоопределением языка
export default function AddWordModal({ open, onClose }) {
  const [text1, setText1]           = useState('');
  const [text2, setText2]           = useState('');
  // Флаги: было ли поле заполнено автопереводом (можно перезаписать следующим автопереводом)
  const [autoFilled1, setAutoFilled1] = useState(false);
  const [autoFilled2, setAutoFilled2] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [duplicate, setDuplicate]     = useState(false);
  const debounceRef                    = useRef(null);

  // Сброс состояния при закрытии модалки
  useEffect(() => {
    if (!open) {
      clearTimeout(debounceRef.current);
      setText1(''); setText2('');
      setAutoFilled1(false); setAutoFilled2(false);
      setTranslating(false); setDuplicate(false);
    }
  }, [open]);

  // Автоперевод при изменении поля 1 — язык определяется автоматически
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);

    if (!text1.trim()) {
      if (autoFilled2) { setText2(''); setAutoFilled2(false); }
      return;
    }
    if (text2 && !autoFilled2) return;

    debounceRef.current = setTimeout(async () => {
      const from = detectLang(text1);
      const to   = from === 'EN' ? 'RU' : 'EN';
      setTranslating(true);
      try {
        const r = await fetch(`/api/translate?word=${encodeURIComponent(text1.trim())}&from=${from}&to=${to}`);
        const d = await r.json();
        setText2(d.translation ?? '');
        setAutoFilled2(true);
      } catch {
        // Молча игнорируем — пользователь введёт перевод вручную
      } finally {
        setTranslating(false);
      }
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text1, open]);

  // Автоперевод при изменении поля 2 — язык определяется автоматически
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);

    if (!text2.trim()) {
      if (autoFilled1) { setText1(''); setAutoFilled1(false); }
      return;
    }
    if (text1 && !autoFilled1) return;

    debounceRef.current = setTimeout(async () => {
      const from = detectLang(text2);
      const to   = from === 'EN' ? 'RU' : 'EN';
      setTranslating(true);
      try {
        const r = await fetch(`/api/translate?word=${encodeURIComponent(text2.trim())}&from=${from}&to=${to}`);
        const d = await r.json();
        setText1(d.translation ?? '');
        setAutoFilled1(true);
      } catch {
        // Молча игнорируем
      } finally {
        setTranslating(false);
      }
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text2, open]);

  function handleSave() {
    const t1 = text1.trim();
    const t2 = text2.trim();
    if (!t1 || !t2) return;

    // Определяем EN и RU — сохраняем EN как слово, RU как перевод
    const isT1Russian = detectLang(t1) === 'RU';
    const enWord = isT1Russian ? t2 : t1;
    const ruWord = isT1Russian ? t1 : t2;

    const saved = saveWord(enWord, ruWord);
    if (!saved) { setDuplicate(true); return; }
    window.dispatchEvent(new Event('savedWordsUpdated'));
    onClose();
  }

  // Детектируем язык для отображения бейджа — только когда есть текст
  const lang1 = text1 ? detectLang(text1) : null;
  const lang2 = text2 ? detectLang(text2) : null;

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Шапка */}
        <div className={styles.modalHeader}>
          <span className={styles.title}>Add word</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Поле 1 */}
        <div className={styles.fieldRow}>
          {lang1 && <span className={styles.langBadge}>{lang1}</span>}
          <input
            className={`${styles.input} ${lang1 ? styles.inputWithBadge : ''}`}
            placeholder="Word or phrase…"
            value={text1}
            autoFocus
            onChange={e => { setText1(e.target.value); setAutoFilled1(false); setDuplicate(false); }}
          />
          {text1 && (
            <button
              className={styles.clearBtn}
              onClick={() => { setText1(''); setAutoFilled1(false); }}
              aria-label="Clear"
            >×</button>
          )}
        </div>

        {/* Разделитель */}
        <div className={styles.arrows}>⇅</div>

        {/* Поле 2 */}
        <div className={styles.fieldRow}>
          {lang2 && <span className={styles.langBadge}>{lang2}</span>}
          <input
            className={`${styles.input} ${lang2 ? styles.inputWithBadge : ''}`}
            placeholder={translating ? '…' : 'Translation…'}
            value={text2}
            onChange={e => { setText2(e.target.value); setAutoFilled2(false); setDuplicate(false); }}
          />
          {text2 && (
            <button
              className={styles.clearBtn}
              onClick={() => { setText2(''); setAutoFilled2(false); }}
              aria-label="Clear"
            >×</button>
          )}
        </div>

        {/* Предупреждение о дублировании */}
        {duplicate && (
          <p className={styles.duplicateMsg}>Это слово уже есть в словаре</p>
        )}

        {/* Кнопка сохранения */}
        <button
          className={styles.saveBtn}
          disabled={!text1.trim() || !text2.trim() || translating}
          onClick={handleSave}
        >
          {translating ? '…' : 'Save'}
        </button>

      </div>
    </div>
  );
}
