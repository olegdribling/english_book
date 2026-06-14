import { useState, useEffect, useCallback, useRef } from 'react';

// Хук разбивки текста главы на страницы по высоте контейнера.
// Бинарный поиск по словам — страница заполняется без пустого места.
export function usePaginate({ text, fontSize, initialPageIndex = 0 }) {
  const containerRef = useRef(null);
  const [pages, setPages]         = useState(null);
  const [pageIndex, setPageIndex] = useState(initialPageIndex);

  // Рефы для доступа к текущей странице внутри recalculate без добавления в deps
  const pagesRef     = useRef(null);
  const pageIndexRef = useRef(initialPageIndex);

  useEffect(() => { pagesRef.current = pages; }, [pages]);
  useEffect(() => { pageIndexRef.current = pageIndex; }, [pageIndex]);

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

    // Разбивка массива параграфов на страницы по высоте h.
    // Принимает свою копию массива (внутри мутирует остатки параграфов).
    const paginateParas = (input) => {
      const paras = input.slice();
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
      return result;
    };

    const paras = text.split('\n\n').map(p => p.replace(/\n/g, ' ')).filter(Boolean);

    // head — первый фрагмент текущей страницы (то с чего она начиналась до пересчёта)
    const currPages = pagesRef.current;
    const currIndex = pageIndexRef.current;
    const head = currPages?.[currIndex]?.[0] || null;

    let newPages = null;
    let anchoredIndex = -1;

    // Якорная пагинация: если знаем с чего начиналась текущая страница —
    // разбиваем текст на «до якоря» и «от якоря», чтобы новая страница
    // начиналась ровно с того же текста
    if (head) {
      // Ищем параграф, в котором начинается head: либо целый параграф,
      // либо хвост параграфа (страница стартовала с середины абзаца)
      const splitIdx = paras.findIndex(p => p === head || p.endsWith(head));
      if (splitIdx !== -1) {
        const p = paras[splitIdx];
        // Часть параграфа до head — уходит на страницы «до»
        const prefix = p.slice(0, p.length - head.length).trim();
        const beforeParas = paras.slice(0, splitIdx);
        if (prefix) beforeParas.push(prefix);
        const afterParas = [head, ...paras.slice(splitIdx + 1)];

        const pagesBefore = beforeParas.length ? paginateParas(beforeParas) : [];
        const pagesAfter  = paginateParas(afterParas);
        newPages = [...pagesBefore, ...pagesAfter];
        anchoredIndex = pagesBefore.length; // страница «от якоря»
      }
    }

    // Обычная пагинация — при первой загрузке или если якорь не найден
    if (!newPages) {
      const result = paginateParas(paras);
      newPages = result.length ? result : [paras];
    }

    document.body.removeChild(m);

    setPages(newPages);
    if (anchoredIndex !== -1) {
      setPageIndex(anchoredIndex);
    } else {
      setPageIndex(prev => Math.min(prev, newPages.length - 1));
    }
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
