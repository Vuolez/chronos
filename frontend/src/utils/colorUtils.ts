// Утилиты для генерации цветов
// Генерирует стабильный цвет на основе строки (имени пользователя)

/**
 * Простая хеш-функция для строки
 * @param str - строка для хеширования
 * @returns число от 0 до 2^32
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Преобразуем в 32-битное число
  }
  return Math.abs(hash);
}

/**
 * Конвертирует HSL в RGB
 * @param h - hue (0-360)
 * @param s - saturation (0-100)
 * @param l - lightness (0-100)
 * @returns RGB строка вида "rgb(r, g, b)"
 */
function hslToRgb(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // ахроматический
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

/**
 * Генерирует красивый цвет на основе имени пользователя
 * @param name - имя пользователя
 * @returns CSS цвет в формате "rgb(r, g, b)"
 */
export function generateUserColor(name: string): string {
  if (!name || name.trim().length === 0) {
    return 'rgb(128, 128, 128)'; // Серый по умолчанию
  }

  const hash = hashString(name.toLowerCase().trim());
  
  // Генерируем hue от 0 до 360 градусов
  const hue = hash % 360;
  
  // Используем низкую насыщенность и высокую яркость для пастельных цветов
  const saturation = 30 + (hash % 15); // 30-45% (мягкая насыщенность)
  const lightness = 75 + (hash % 10);  // 75-85% (высокая яркость для пастели)
  
  return hslToRgb(hue, saturation, lightness);
}

/**
 * Генерирует контрастный цвет текста (белый или черный) для фона
 * @param backgroundColor - цвет фона в формате "rgb(r, g, b)"
 * @returns "#ffffff" или "#000000"
 */
export function getContrastTextColor(backgroundColor: string): string {
  // Извлекаем RGB значения из строки "rgb(r, g, b)"
  const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!rgbMatch) return '#ffffff';
  
  const r = parseInt(rgbMatch[1]);
  const g = parseInt(rgbMatch[2]);
  const b = parseInt(rgbMatch[3]);
  
  // Вычисляем относительную яркость
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Для пастельных цветов используем более низкий порог (0.4 вместо 0.5)
  return luminance > 0.4 ? '#000000' : '#ffffff';
}

/**
 * Получает первую букву имени (заглавную)
 * @param name - имя пользователя
 * @returns первая буква имени в верхнем регистре
 */
export function getInitial(name: string): string {
  if (!name || name.trim().length === 0) {
    return '?';
  }
  return name.trim().charAt(0).toUpperCase();
}