// UI состояния и типы для фронтенда
// Это внутренние типы приложения, не связанные с API

// Состояние календаря
export interface CalendarState {
  currentMonth: number; // 0-11
  currentYear: number;
  selectedDates: string[]; // массив выбранных дат в ISO format
}

// Состояние приложения
export interface AppState {
  currentMeeting?: string; // ID текущей встречи
  isLoading: boolean;
  error?: string;
}

// Типы для календаря
export interface CalendarDay {
  date: string;        // ISO date string
  dayNumber: number;   // день месяца (1-31)
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  participants: string[]; // имена участников, выбравших этот день
}

// Месяцы для отображения
export const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
] as const;

// Дни недели
export const WEEKDAYS = [
  'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'
] as const;