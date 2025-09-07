// Утилиты для работы с датами
// Специально для календаря встреч

import { CalendarDay, MONTHS } from '../types';

/**
 * Форматирует дату в ISO формат (YYYY-MM-DD)
 * Аналог LocalDate.toString() в Java
 */
export const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Парсит ISO дату в Date объект
 * Аналог LocalDate.parse() в Java
 */
export const parseISODate = (isoDate: string): Date => {
  return new Date(isoDate + 'T00:00:00');
};

/**
 * Получает текущую дату в ISO формате
 */
export const getTodayISO = (): string => {
  return formatDateToISO(new Date());
};

/**
 * Проверяет, является ли дата сегодняшней
 */
export const isToday = (isoDate: string): boolean => {
  return isoDate === getTodayISO();
};

/**
 * Получает название месяца по номеру (0-11)
 */
export const getMonthName = (monthIndex: number): string => {
  return MONTHS[monthIndex];
};

/**
 * Получает дни для отображения в календаре
 * Включает дни предыдущего и следующего месяца для заполнения сетки
 */
export const getCalendarDays = (
  year: number, 
  month: number, 
  selectedDates: string[] = []
): CalendarDay[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Понедельник = 1, Вторник = 2, ..., Воскресенье = 0
  // Преобразуем в 0 = Понедельник, 1 = Вторник, ..., 6 = Воскресенье
  const firstDayWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  
  const days: CalendarDay[] = [];
  
  // Дни предыдущего месяца
  const prevMonth = new Date(year, month - 1, 0);
  for (let i = firstDayWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonth.getDate() - i);
    const isoDate = formatDateToISO(date);
    
    days.push({
      date: isoDate,
      dayNumber: date.getDate(),
      isCurrentMonth: false,
      isSelected: selectedDates.includes(isoDate),
      isToday: isToday(isoDate),
      participants: []
    });
  }
  
  // Дни текущего месяца
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const isoDate = formatDateToISO(date);
    
    days.push({
      date: isoDate,
      dayNumber: day,
      isCurrentMonth: true,
      isSelected: selectedDates.includes(isoDate),
      isToday: isToday(isoDate),
      participants: []
    });
  }
  
  // Дни следующего месяца (до заполнения 42 дня = 6 недель)
  const totalCells = 42;
  const remainingCells = totalCells - days.length;
  
  for (let day = 1; day <= remainingCells; day++) {
    const date = new Date(year, month + 1, day);
    const isoDate = formatDateToISO(date);
    
    days.push({
      date: isoDate,
      dayNumber: day,
      isCurrentMonth: false,
      isSelected: selectedDates.includes(isoDate),
      isToday: isToday(isoDate),
      participants: []
    });
  }
  
  return days;
};

/**
 * Переход к предыдущему месяцу
 */
export const getPreviousMonth = (year: number, month: number): { year: number; month: number } => {
  if (month === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: month - 1 };
};

/**
 * Переход к следующему месяцу
 */
export const getNextMonth = (year: number, month: number): { year: number; month: number } => {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
};

/**
 * Добавляет участников к дням календаря
 * На основе их доступности
 */
export const addParticipantsToCalendarDays = (
  days: CalendarDay[],
  availabilities: Array<{ date: string; participantName: string }>
): CalendarDay[] => {
  // Группируем доступности по датам
  const participantsByDate = availabilities.reduce((acc, avail) => {
    if (!acc[avail.date]) {
      acc[avail.date] = [];
    }
    acc[avail.date].push(avail.participantName);
    return acc;
  }, {} as Record<string, string[]>);
  
  // Добавляем участников к дням
  return days.map(day => ({
    ...day,
    participants: participantsByDate[day.date] || []
  }));
};