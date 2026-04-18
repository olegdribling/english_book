import { useState, useEffect, useCallback, useRef } from 'react';

// Хук разбивки текста главы на страницы по высоте контейнера.
// Бинарный поиск по словам — страница заполняется без пустого места.
export function usePaginate({ text, fontSize, initialPageIndex = 0 }) {
  const containerRef = useRef(null);
  const [pages, setPages]         = useState(null);
  const [pageIndex, setPageIndex] = useState(initialPageIndex);

  const recalculate = useCallback(() => {
    const el = containerRef.current;
    if (!el || !text) return;
    const h = el.clientHeight;
    const w = el.clientWidth;
    if (h < 20 || w < 20) return;

    // Скрытый блок с теми же стилями что у реального контейнера — для замера высоты
    const m = document.createElement('div');
    m.style.cssText = [
      'position:fixed',
      'visibility:hidden',
      'pointer-events:none',
      'top:0',
      'left:-9999px',
      `width:${w}px`,
      `font-size:${fontSize}px`,
      'line-height:1.75',
      'padding:1rem 1.25rem',
      'box-sizing:border-box',
    ].join(';');
    document.body.appendChild(m);

    // Рендерим массив параграфов — последний без нижнего отступа
    const renderParas = (items) => items.map((t, i) =>
      `<p style="margin:0 0 ${i < items.length - 1 ? '1rem' : '0'}">${t}</p>`
    ).join('');

    const paras = text.split('\n\n').map(p => p.replace(/\n/g, ' ')).filter(Boolean);
    const result = [];
    let curr = [];
    let i = 0;

    while (i < paras.length) {
      const para = paras[i];

      m.innerHTML = renderParas([...curr, para]);

      if (m.scrollHeight <= h) {
        // Весь параграф влезает — добавляем на текущую страницу
        curr.push(para);
        i++;
      } else {
        // Ищем максимальное число слов параграфа которое влезает в оставшееся место
        const words = para.split(' ');
        let lo = 1, hi = words.length - 1, best = 0;

        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          m.innerHTML = renderParas([...curr, words.slice(0, mid).join(' ')]);
          if (m.scrollHeight <= h) { best = mid; lo = mid + 1; }
          else hi = mid - 1;
        }

        if (best > 0) {
          // Часть слов влезла — добавляем их, закрываем страницу, остаток в очередь
          curr.push(words.slice(0, best).join(' '));
          result.push([...curr]);
          curr = [];
          paras[i] = words.slice(best).join(' ');
          // Не инкрементируем i — продолжаем с остатком параграфа
        } else if (curr.length > 0) {
          // Ни одно слово не влезает рядом с текущим контентом — закрываем страницу
          result.push([...curr]);
          curr = [];
          // Не инкрементируем i — повторяем параграф на пустой странице
        } else {
          // Ни одно слово не влезает даже в пустую страницу — форсируем целиком
          result.push([para]);
          i++;
        }
      }
    }

    if (curr.length > 0) result.push(curr);
    document.body.removeChild(m);

    const newPages = result.length ? result : [paras];
    setPages(newPages);
    setPageIndex(prev => Math.min(prev, newPages.length - 1));
  }, [text, fontSize]);

  useEffect(() => { recalculate(); }, [recalculate]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(recalculate);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recalculate]);

  const goNext = useCallback(() => {
    setPageIndex(i => (pages && i < pages.length - 1 ? i + 1 : i));
  }, [pages]);

  const goPrev = useCallback(() => {
    setPageIndex(i => (i > 0 ? i - 1 : i));
  }, []);

  return {
    containerRef,
    pages,
    pageIndex,
    goNext,
    goPrev,
    isFirst: pageIndex === 0,
    isLast:  pages ? pageIndex === pages.length - 1 : false,
    total:   pages?.length ?? 0,
  };
}
