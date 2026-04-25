// Цвета уровней сложности (от зелёного к красному)
export const LEVEL_COLORS = {
  A1:  '#4caf50',
  A2:  '#8bc34a',
  B1:  '#ffc107',
  'B1+': '#ffab00',
  B2:  '#ff7043',
  'B2+': '#f4511e',
  C1:  '#f44336',
};

// Массив для обратной совместимости (используется в настройках и т.д.)
export const LEVELS = Object.entries(LEVEL_COLORS).map(([value, color]) => ({ value, color }));

// Ключ в localStorage для уровня конкретной книги
function storageKey(author, title) {
  return `bookLevel:${author}/${title}`;
}

// Читает сохранённый уровень для книги (по умолчанию B1)
export function getSavedLevel(author, title) {
  return localStorage.getItem(storageKey(author, title)) || 'B1';
}

// Сохраняет выбранный уровень для книги
export function saveLevel(author, title, level) {
  localStorage.setItem(storageKey(author, title), level);
}
