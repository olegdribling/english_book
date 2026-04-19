#!/usr/bin/env python3
"""
Конвертирует все PDF в папке library/EnglishPod/ в HTML-файлы.

Правила:
  - Хедер (верхние HEADER_ZONE% страницы) сохраняется только на первой странице
  - Футер (нижние FOOTER_ZONE% страницы) удаляется со всех страниц
  - Строки внутри блока объединяются пробелом (убираем PDF-переносы строк)
  - Перенос слов через дефис в конце строки восстанавливается
  - Метки диалога (A:, B: и т.д.) оборачиваются в <span class="speaker">

Установка зависимости:
  pip install pymupdf

Запуск из корня проекта:
  python3 scripts/pdf_to_html.py
"""

import fitz  # pymupdf
import re
from pathlib import Path

# Порог зон: доля от высоты страницы
HEADER_ZONE = 0.12  # верхние 12% — хедер
FOOTER_ZONE = 0.12  # нижние 12% — футер

# Метка реплики в диалоге: одна–две заглавных буквы и двоеточие (A:, B:, AB:)
SPEAKER_RE = re.compile(r'^([A-Z]{1,2}):$')

# Части речи — строки с этими словами в <em> считаются маркером словарной статьи
POS_WORDS = {
    'Noun', 'Verb', 'Adjective', 'Adverb', 'Phrase',
    'Idiom', 'Expression', 'Pronoun', 'Conjunction', 'Preposition',
}


def strip_tags(s):
    """Убирает HTML-теги для анализа текста."""
    return re.sub(r'<[^>]+>', '', s)


def join_lines(lines):
    """
    Объединяет строки блока в одну строку:
    - Если строка заканчивается на дефис — склеиваем без пробела (восстанавливаем слово)
    - Иначе — добавляем пробел
    """
    result = ''
    for i, line in enumerate(lines):
        if i == 0:
            result = line
            continue
        plain = strip_tags(result).rstrip()
        if plain.endswith('-'):
            # Убираем дефис в конце (он может быть внутри тега)
            result = re.sub(r'-(\s*(?:<[^>]+>)?\s*)$', r'\1', result.rstrip())
            result += line.lstrip()
        else:
            result += ' ' + line
    return result


def render_span(span):
    """Рендерит один span с учётом стилей (жирный / курсив)."""
    text = span['text']
    if not text.strip():
        return text
    flags = span['flags']
    if flags & 16:
        return f'<strong>{text}</strong>'
    if flags & 2:
        return f'<em>{text}</em>'
    return text


def block_to_html(block):
    """
    Преобразует один текстовый блок в HTML-параграф.
    Возвращает строку <p>...</p> или None если блок пустой.

    Форматирование:
    - Диалог: A:, B: → <span class="speaker">
    - Словарь: слово — <em>PartOfSpeech</em> — определение
    """
    lines = []
    for line in block['lines']:
        line_html = ''.join(render_span(s) for s in line['spans'])
        plain = strip_tags(line_html).strip()
        if plain:
            lines.append(line_html)

    if not lines:
        return None

    # Диалог: первая строка — метка персонажа (A:, B:)
    first_plain = strip_tags(lines[0]).strip()
    if SPEAKER_RE.match(first_plain) and len(lines) > 1:
        speaker = f'<span class="speaker">{first_plain}</span>'
        rest    = join_lines(lines[1:])
        return f'<p>{speaker} {rest}</p>'

    # Словарь: проверяем есть ли в блоке строка с частью речи
    pos_index = None
    for i, line in enumerate(lines):
        plain = strip_tags(line).strip()
        if plain in POS_WORDS:
            pos_index = i
            break

    if pos_index is not None:
        word = join_lines(lines[:pos_index]) if pos_index > 0 else ''
        pos  = lines[pos_index]  # уже обёрнут в <em>
        defn = join_lines(lines[pos_index + 1:]) if pos_index + 1 < len(lines) else ''

        parts = []
        if word:
            parts.append(f'<strong>{strip_tags(word)}</strong>')
        parts.append(pos)
        if defn:
            parts.append(defn)
        return '<p>' + ' — '.join(parts) + '</p>'

    return f'<p>{join_lines(lines)}</p>'


def page_to_html(page, skip_header):
    """Собирает HTML всех блоков страницы с учётом зон хедера/футера."""
    page_height = page.rect.height
    blocks      = page.get_text('dict')['blocks']
    parts       = []

    for block in blocks:
        if block['type'] != 0:
            continue

        y0 = block['bbox'][1]
        y1 = block['bbox'][3]

        if skip_header and y1 < page_height * HEADER_ZONE:
            continue
        if y0 > page_height * (1 - FOOTER_ZONE):
            continue

        html = block_to_html(block)
        if html:
            parts.append(html)

    return '\n'.join(parts)


def convert_pdf(pdf_path: Path):
    """Конвертирует один PDF-файл в HTML рядом с ним."""
    html_path = pdf_path.with_suffix('.html')
    doc       = fitz.open(str(pdf_path))
    pages     = []

    for i, page in enumerate(doc):
        html = page_to_html(page, skip_header=(i > 0))
        if html:
            pages.append(html)

    doc.close()

    # Страницы объединяем без разделителя
    body = '\n'.join(pages)

    # Убираем заголовочный параграф с названием урока и кодом (B0001, E0029 и т.д.) —
    # он дублирует хедер приложения
    body = re.sub(r'<p>.*?\([A-Z]\d{4}\).*?</p>\n?', '', body, count=1)

    # Вставляем разделительную линию перед секциями словаря
    for heading in ('Key Vocabulary', 'Supplementary Vocabulary'):
        body = body.replace(
            f'<p><strong>{heading}</strong></p>',
            f'<hr class="section-break">\n<p><strong>{heading}</strong></p>',
        )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
{body}
</body>
</html>"""

    html_path.write_text(html, encoding='utf-8')
    print(f'    ✓  {html_path.name}')


def main():
    root          = Path(__file__).parent.parent
    englishpod_dir = root / 'library' / 'EnglishPod'

    if not englishpod_dir.exists():
        print(f'Папка не найдена: {englishpod_dir}')
        return

    pdf_files = sorted(englishpod_dir.rglob('*.pdf'))

    if not pdf_files:
        print('PDF файлы не найдены.')
        return

    print(f'Найдено PDF: {len(pdf_files)}\n')
    for pdf_path in pdf_files:
        print(f'  {pdf_path.parent.name}/')
        convert_pdf(pdf_path)

    print(f'\nГотово. Сконвертировано файлов: {len(pdf_files)}')


if __name__ == '__main__':
    main()
