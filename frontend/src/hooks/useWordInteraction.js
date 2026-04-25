import { useEffect, useCallback, useRef } from 'react';

// Регулярка: строка является одним английским словом (буквы + апостроф)
const WORD_RE = /^[a-zA-Z''\u2019-]+$/;

// Символы которые входят в слово
const WORD_CHAR = /[a-zA-Z''\u2019]/;

// iOS не даёт координаты в contextmenu и даёт неверный каретRangeFromPoint в touchend
const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

// Убираем из строки всё кроме букв, апострофов и дефисов,
// затем срезаем дефисы с краёв (чтобы не было "-hole" или "rabbit-")
function cleanWord(str) {
  return str.replace(/[^a-zA-Z''\u2019-]/g, '').replace(/^-+|-+$/g, '').trim();
}

// Расширяет позицию (node, offset) влево и вправо до границ слова.
// Возвращает { word, rect } или null если в точке нет буквы.
function expandToWord(node, offset) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;

  const text = node.textContent;
  if (!text.length) return null;

  let pos = Math.min(offset, text.length - 1);
  if (pos > 0 && !WORD_CHAR.test(text[pos])) pos--;
  if (!WORD_CHAR.test(text[pos])) return null;

  let start = pos;
  let end   = pos + 1;

  // Расширяем влево — включаем дефис только если перед ним тоже буква
  while (start > 0) {
    if (WORD_CHAR.test(text[start - 1])) { start--; }
    else if (text[start - 1] === '-' && start >= 2 && WORD_CHAR.test(text[start - 2])) { start -= 2; }
    else break;
  }

  // Расширяем вправо — включаем дефис только если после него тоже буква
  while (end < text.length) {
    if (WORD_CHAR.test(text[end])) { end++; }
    else if (text[end] === '-' && end + 1 < text.length && WORD_CHAR.test(text[end + 1])) { end += 2; }
    else break;
  }

  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);

  const word = cleanWord(range.toString());
  if (!word || !WORD_RE.test(word)) return null;

  return {
    word,
    rect:  range.getBoundingClientRect(),
    rects: Array.from(range.getClientRects()),
  };
}

// Возвращает { node, offset } позиции курсора по экранным координатам
function getCaretAt(x, y) {
  let node, offset;

  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    if (!range) return null;
    node   = range.startContainer;
    offset = range.startOffset;
  } else if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (!pos) return null;
    node   = pos.offsetNode;
    offset = pos.offset;
  } else {
    return null;
  }

  // Если браузер вернул элемент вместо текстового узла — берём первый дочерний текст
  if (node && node.nodeType === Node.ELEMENT_NODE) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    node   = walker.nextNode();
    offset = 0;
  }

  return node ? { node, offset } : null;
}

// Находит слово по экранным координатам через caretRangeFromPoint
function getWordAtPoint(x, y) {
  const caret = getCaretAt(x, y);
  return caret ? expandToWord(caret.node, caret.offset) : null;
}

// Находит предложение, содержащее позицию (node, offset).
// Границы предложения — символы . ! ?
// Текстовые узлы внутри .speaker (метки персонажей A:, B:) исключаются из поиска и Range.
// Возвращает { sentence, rect, rects } или null.
function getSentenceContaining(node, offset) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;

  const para = node.parentElement?.closest('p');
  if (!para) return null;

  // Собираем сегменты текста, пропуская узлы внутри .speaker
  const walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT);
  const segments = []; // { node, start, end } в отфильтрованном тексте
  let filteredText = '';
  let charOffset = -1;
  let cur;

  while ((cur = walker.nextNode())) {
    if (cur.parentElement?.classList.contains('speaker')) continue;
    const segStart = filteredText.length;
    filteredText += cur.textContent;
    segments.push({ node: cur, start: segStart, end: filteredText.length });
    if (charOffset === -1 && cur === node) {
      charOffset = segStart + offset;
    }
  }

  if (charOffset === -1 || !filteredText) return null;

  // Ищем границы предложения
  let start = charOffset;
  let end   = charOffset;

  while (start > 0 && !/[.!?]/.test(filteredText[start - 1])) start--;
  while (end < filteredText.length && !/[.!?]/.test(filteredText[end])) end++;
  if (end < filteredText.length) end++;

  const sentence = filteredText.slice(start, end).trim();
  if (!sentence || sentence.split(/\s+/).length < 2) return null;

  // Строим Range по сегментам для точного выделения
  const range    = document.createRange();
  let startSet   = false;
  let endSet     = false;

  for (const seg of segments) {
    if (!startSet && seg.end > start) {
      range.setStart(seg.node, start - seg.start);
      startSet = true;
    }
    if (startSet && !endSet && seg.end >= end) {
      range.setEnd(seg.node, Math.min(end - seg.start, seg.node.textContent.length));
      endSet = true;
      break;
    }
  }

  if (!startSet || !endSet) return null;

  return {
    sentence,
    rect:  range.getBoundingClientRect(),
    rects: Array.from(range.getClientRects()),
  };
}

// Хук перехватывает нажатия на текст и вызывает onWord(word, rect):
// - мобиль: двойной тап → всегда переводит слово
// - мобиль: долгий тап → переводит предложение (или слово если предложение не найдено)
//   iOS: долгий тап через touchstart+таймер (contextmenu на iOS не даёт координаты)
//   Android: долгий тап через contextmenu
// - десктоп: выделение мышью → mouseup → попап
export function useWordInteraction(containerRef, onWord) {

  // Время последнего touchstart — чтобы отличать мышиный mouseup от тач-синтетического
  const lastTouchRef = useRef(0);

  // Данные предыдущего тапа для определения double-tap
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  // iOS: координаты сохранённые в touchstart — точнее чем changedTouches в touchend
  const touchStartCoordsRef = useRef(null);

  // iOS: таймер долгого нажатия
  const longPressTimerRef = useRef(null);

  useEffect(() => {
    const onTouchStart = () => { lastTouchRef.current = Date.now(); };
    // При завершении тача сразу снимаем выделение — убираем синюю подсветку при коротком тапе
    const onTouchEnd = () => { window.getSelection()?.removeAllRanges(); };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

  // Общая логика долгого нажатия — используется и в contextmenu (Android), и в таймере (iOS)
  const handleLongPress = useCallback((x, y) => {
    window.getSelection()?.removeAllRanges();
    // Сбрасываем чтобы следующий тап после долгого не выглядел как double-tap
    lastTapRef.current = { time: 0, x: 0, y: 0 };

    const caret = getCaretAt(x, y);
    if (!caret) return;

    const result = getSentenceContaining(caret.node, caret.offset);
    if (result) { onWord(result.sentence, result.rect, result.rects); return; }

    const wordResult = expandToWord(caret.node, caret.offset);
    if (wordResult) onWord(wordResult.word, wordResult.rect, wordResult.rects);
  }, [onWord]);

  // Contextmenu срабатывает на долгий тап (Android) и правую кнопку мыши (desktop).
  // e.preventDefault() вызываем всегда — блокируем нативное меню iOS/Android.
  // На iOS координаты могут отсутствовать, долгий тап обрабатывается таймером ниже.
  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    if (isIOS) return;
    if (!e.clientX && !e.clientY) return;
    handleLongPress(e.clientX, e.clientY);
  }, [handleLongPress]);

  // iOS: touchstart на контейнере — сохраняем координаты и запускаем таймер долгого нажатия
  const onContainerTouchStart = useCallback((e) => {
    if (!isIOS) return;
    if (e.touches.length !== 1) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      return;
    }
    const touch = e.touches[0];
    touchStartCoordsRef.current = { x: touch.clientX, y: touch.clientY };

    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      const coords = touchStartCoordsRef.current;
      if (coords) handleLongPress(coords.x, coords.y);
    }, 600);
  }, [handleLongPress]);

  // iOS: если палец сдвинулся более чем на 10px — отменяем долгое нажатие (это свайп)
  const onContainerTouchMove = useCallback((e) => {
    if (!isIOS || !longPressTimerRef.current) return;
    const touch = e.touches[0];
    const saved = touchStartCoordsRef.current;
    if (!saved) return;
    if (Math.abs(touch.clientX - saved.x) > 10 || Math.abs(touch.clientY - saved.y) > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Десктоп: пользователь выделил слово мышью — перехватываем в mouseup.
  // На мобайле mouseup синтезируется после тача — пропускаем если был недавний touchstart.
  const onMouseUp = useCallback((e) => {
    if (e.button !== 0) return;
    if (Date.now() - lastTouchRef.current < 500) return;

    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;

      const selectedText = sel.toString().trim();
      if (!selectedText) return;

      const selRange = sel.getRangeAt(0);
      const rect     = selRange.getBoundingClientRect();
      const rects    = Array.from(selRange.getClientRects());

      const word = cleanWord(selectedText);
      if (!word || !WORD_RE.test(word)) return;

      sel.removeAllRanges();
      onWord(word, rect, rects);
    }, 0);
  }, [onWord]);

  // Мобиль: double-tap → всегда переводит слово под пальцем.
  // iOS: для поиска слова используем координаты из touchstart — на touchend caretRangeFromPoint
  //      может вернуть неверную позицию.
  // Вешаем на контейнер (не document) чтобы e.preventDefault() блокировал
  // всплытие до document.touchend, который снимает выделение.
  const onContainerTouchEnd = useCallback((e) => {
    // Отменяем таймер долгого нажатия — он мог ещё не сработать
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;

    if (!e.changedTouches.length) return;
    const touch = e.changedTouches[0];
    const now   = Date.now();
    const last  = lastTapRef.current;

    // iOS: берём координаты из touchstart — точнее при определении позиции слова
    const coords = (isIOS && touchStartCoordsRef.current)
      ? touchStartCoordsRef.current
      : { x: touch.clientX, y: touch.clientY };

    const dx = Math.abs(coords.x - last.x);
    const dy = Math.abs(coords.y - last.y);

    if (now - last.time < 400 && dx < 30 && dy < 30) {
      // double-tap — переводим слово
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      const caret = getCaretAt(coords.x, coords.y);
      if (caret) {
        const result = expandToWord(caret.node, caret.offset);
        if (result) onWord(result.word, result.rect, result.rects);
      }
      lastTapRef.current = { time: 0, x: 0, y: 0 };
    } else {
      lastTapRef.current = { time: now, x: coords.x, y: coords.y };
    }
  }, [onWord]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('contextmenu',  onContextMenu);
    el.addEventListener('mouseup',      onMouseUp);
    el.addEventListener('touchstart',   onContainerTouchStart, { passive: true });
    el.addEventListener('touchmove',    onContainerTouchMove,  { passive: true });
    el.addEventListener('touchend',     onContainerTouchEnd);

    return () => {
      el.removeEventListener('contextmenu',  onContextMenu);
      el.removeEventListener('mouseup',      onMouseUp);
      el.removeEventListener('touchstart',   onContainerTouchStart);
      el.removeEventListener('touchmove',    onContainerTouchMove);
      el.removeEventListener('touchend',     onContainerTouchEnd);
    };
  }, [containerRef, onContextMenu, onMouseUp, onContainerTouchStart, onContainerTouchMove, onContainerTouchEnd]);
}
