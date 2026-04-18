import { useState, useEffect, useCallback, useRef } from 'react';

// Хук разбивки текста главы на страницы по высоте контейнера
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

    const paras = text.split('\n\n').map(p => p.replace(/\n/g, ' ')).filter(Boolean);
    const result = [];
    let curr = [];

    for (const p of paras) {
      curr.push(p);
      // Последний параграф без нижнего отступа — как в реальном CSS (.staticPage p:last-child)
      m.innerHTML = curr.map((t, i) =>
        `<p style="margin:0 0 ${i < curr.length - 1 ? '1rem' : '0'}">${t}</p>`
      ).join('');
      if (m.scrollHeight > h && curr.length > 1) {
        // Параграф не влез — отправляем его на следующую страницу
        curr.pop();
        result.push([...curr]);
        curr = [p];
        m.innerHTML = `<p style="margin:0">${p}</p>`;
      }
    }
    if (curr.length) result.push([...curr]);
    document.body.removeChild(m);

    const newPages = result.length ? result : [paras];
    setPages(newPages);
    setPageIndex(prev => Math.min(prev, newPages.length - 1));
  }, [text, fontSize]);

  // Пересчёт при изменении текста или шрифта
  useEffect(() => { recalculate(); }, [recalculate]);

  // Пересчёт при изменении размера контейнера
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
