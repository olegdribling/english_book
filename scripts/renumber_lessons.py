#!/usr/bin/env python3
"""
Переименовывает папки уроков в последовательную нумерацию 001, 002, 003...
сохраняя текущий порядок (сортировка по имени папки).

Запуск (dry-run — только показывает что будет):
  python3 scripts/renumber_lessons.py

Запуск с реальным переименованием:
  python3 scripts/renumber_lessons.py --apply
"""

import sys
import os
from pathlib import Path

LEVELS = ['Elementary', 'Intermediatle', 'Upper Intermediatly', 'Advanced']

def renumber(level_dir: Path, apply: bool):
    folders = sorted([
        f for f in level_dir.iterdir()
        if f.is_dir()
    ])

    if not folders:
        return

    print(f"\n  {level_dir.name}/ ({len(folders)} уроков)")

    changes = []
    for i, folder in enumerate(folders, start=1):
        name     = folder.name
        # Убираем старый номер — всё после первого дефиса
        rest     = name[name.index('-'):]
        new_name = f'{i:03d}{rest}'

        if new_name != name:
            changes.append((folder, folder.parent / new_name))
            print(f'    {name}')
            print(f'    → {new_name}')
        else:
            print(f'    {name}  (без изменений)')

    if apply and changes:
        # Переименовываем через временные имена чтобы избежать конфликтов
        tmp_map = {}
        for src, dst in changes:
            tmp = src.parent / (src.name + '__tmp__')
            os.rename(src, tmp)
            tmp_map[tmp] = dst
        for tmp, dst in tmp_map.items():
            os.rename(tmp, dst)
        print(f'    ✓ Переименовано: {len(changes)}')


def main():
    apply   = '--apply' in sys.argv
    root    = Path(__file__).parent.parent
    ep_dir  = root / 'library' / 'EnglishPod'

    if not ep_dir.exists():
        print(f'Папка не найдена: {ep_dir}')
        return

    if apply:
        print('Режим: РЕАЛЬНОЕ ПЕРЕИМЕНОВАНИЕ')
    else:
        print('Режим: DRY-RUN (передай --apply чтобы применить)')

    for level in LEVELS:
        level_dir = ep_dir / level
        if level_dir.exists():
            renumber(level_dir, apply)

    if not apply:
        print('\nЧтобы применить: python3 scripts/renumber_lessons.py --apply')


if __name__ == '__main__':
    main()
