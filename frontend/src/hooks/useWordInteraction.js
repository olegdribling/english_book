import { useEffect, useCallback, useRef } from 'react';

// Регулярка: строка является одним английским словом (буквы + апостроф)
const WORD_RE = /^[a-zA-Z''\u2019-]+$/;

// Символы которые входят в слово
const WORD_CHAR = /[a-zA-Z''\u2019]/;

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
// Возвращает { sentence, rect, rects } или null.
function getSentenceContaining(node, offset) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;

  const para = node.parentElement?.closest('p');
  if (!para) return null;

  const paraText = para.textContent;

  // Вычисляем абсолютный offset внутри текста параграфа
  let charOffset = 0;
  const walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT);
  let found = false;
  let cur;
  while ((cur = walker.nextNode())) {
    if (cur === node) {
      charOffset += offset;
      found = true;
      break;
    }
    charOffset += cur.textContent.length;
  }
  if (!found) return null;

  // Ищем границы предложения
  let start = charOffset;
  let end   = charOffset;

  while (start > 0 && !/[.!?]/.test(paraText[start - 1])) start--;
  while (end < paraText.length && !/[.!?]/.test(paraText[end])) end++;
  if (end < paraText.length) end++;

  const sentence = paraText.slice(start, end).trim();
  if (!sentence || sentence.split(/\s+/).length < 2) return null;

  // Строим Range для полного предложения чтобы получить точные rects каждой строки
  const range = document.createRange();
  const walker2 = document.createTreeWalker(para, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let startSet = false;
  let endSet   = false;
  while ((cur = walker2.nextNode())) {
    const len = cur.textContent.length;
    if (!startSet && pos + len > start) {
      range.setStart(cur, start - pos);
      startSet = true;
    }
    if (startSet && !endSet && pos + len >= end) {
      range.setEnd(cur, Math.min(end - pos, len));
      endSet = true;
      break;
    }
    pos += len;
  }

  if (!startSet || !endSet) return null;

  return {
    sentence,
    rect:  range.getBoundingClientRect(),
    rects: Array.from(range.getClientRects()),
  };
}

// Хук перехватывает нажатия на текст и вызывает onWord(word, rect):
// - мобиль: contextmenu (долгий тап) → координаты → находим слово/предложение → попап
// - десктоп: выделение мышью → mouseup → попап
//
// translateLine: если true — переводим предложение целиком вместо отдельного слова
export function useWordInteraction(containerRef, onWord, translateLine = false) {

  // Время последнего touchstart — чтобы отличать мышиный mouseup от тач-синтетического
  const lastTouchRef = useRef(0);

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

  // Мобиль: contextmenu срабатывает именно на долгий тап.
  // preventDefault вызывается глобально в main.jsx, здесь только логика перевода.
  const onContextMenu = useCallback((e) => {
    if (!e.clientX && !e.clientY) return;

    // Снимаем выделение которое браузер мог поставить при долгом нажатии
    window.getSelection()?.removeAllRanges();

    const caret = getCaretAt(e.clientX, e.clientY);
    if (!caret) return;

    const wordResult = expandToWord(caret.node, caret.offset);
    if (!wordResult) return;

    if (translateLine) {
      const result = getSentenceContaining(caret.node, caret.offset);
      if (result) {
        onWord(result.sentence, result.rect, result.rects);
        return;
      }
    }

    onWord(wordResult.word, wordResult.rect, wordResult.rects);
  }, [onWord, translateLine]);

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

      if (translateLine) {
        let node   = selRange.startContainer;
        let offset = selRange.startOffset;
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tw = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          node   = tw.nextNode();
          offset = 0;
        }
        if (node) {
          const result = getSentenceContaining(node, offset);
          sel.removeAllRanges();
          if (result) {
            onWord(result.sentence, result.rect, result.rects);
            return;
          }
        }
      }

      const word = cleanWord(selectedText);
      if (!word || !WORD_RE.test(word)) return;

      sel.removeAllRanges();
      onWord(word, rect, rects);
    }, 0);
  }, [onWord, translateLine]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('contextmenu', onContextMenu);
    el.addEventListener('mouseup',     onMouseUp);

    return () => {
      el.removeEventListener('contextmenu', onContextMenu);
      el.removeEventListener('mouseup',     onMouseUp);
    };
  }, [containerRef, onContextMenu, onMouseUp]);
}
