// Компонент календаря для выбора дат
// Соответствует требованиям iteration_1.md

import React, { useState } from 'react';
import { 
  getCalendarDays, 
  getMonthName, 
  getPreviousMonth, 
  getNextMonth,
  addParticipantsToCalendarDays 
} from '../../services';
import { CalendarDay, WEEKDAYS } from '../../types';
import UserAvatar from '../UserAvatar';
import './Calendar.css';

interface CalendarProps {
  selectedDates: string[];           // Выбранные даты в ISO формате
  onDateClick: (date: string) => void; // Обработчик клика по дате
  participantAvailabilities?: Array<{  // Доступности участников для отображения
    date: string;
    participantName: string;
  }>;
}

const Calendar: React.FC<CalendarProps> = ({
  selectedDates,
  onDateClick,
  participantAvailabilities = []
}) => {
  // Состояние текущего месяца и года
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Получаем дни для отображения (БЕЗ selectedDates, чтобы не влиять на isSelected)
  const calendarDays = getCalendarDays(currentYear, currentMonth, []);
  
  // Добавляем участников к дням календаря
  const daysWithParticipants = addParticipantsToCalendarDays(
    calendarDays, 
    participantAvailabilities
  );
  
  // Добавляем информацию о выбранных датах текущего пользователя
  const daysWithSelection = daysWithParticipants.map(day => ({
    ...day,
    isSelectedByCurrentUser: selectedDates.includes(day.date)
  }));

  // Переход к предыдущему месяцу
  const handlePreviousMonth = () => {
    const { year, month } = getPreviousMonth(currentYear, currentMonth);
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  // Переход к следующему месяцу
  const handleNextMonth = () => {
    const { year, month } = getNextMonth(currentYear, currentMonth);
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  // Обработчик клика по дню
  const handleDayClick = (day: CalendarDay) => {
    // Только дни текущего месяца можно выбирать
    if (day.isCurrentMonth) {
      onDateClick(day.date);
    }
  };

  return (
    <div className="calendar">
      {/* Заголовок с навигацией */}
      <div className="calendar-header">
        <button 
          className="nav-btn"
          onClick={handlePreviousMonth}
          aria-label="Предыдущий месяц"
        >
          ←
        </button>
        
        <h2 className="month-year">
          {getMonthName(currentMonth)} {currentYear}
        </h2>
        
        <button 
          className="nav-btn"
          onClick={handleNextMonth}
          aria-label="Следующий месяц"
        >
          →
        </button>
      </div>

      {/* Заголовки дней недели */}
      <div className="weekdays">
        {WEEKDAYS.map((day) => (
          <div key={day} className="weekday">
            {day}
          </div>
        ))}
      </div>

      {/* Сетка дней */}
      <div className="calendar-grid">
        {daysWithSelection.map((day, index) => (
          <div
            key={`${day.date}-${index}`}
            className={`calendar-day ${
              day.isCurrentMonth ? 'current-month' : 'other-month'
            } ${
              day.isSelectedByCurrentUser ? 'selected' : ''
            } ${
              day.isToday ? 'today' : ''
            }`}
            onClick={() => handleDayClick(day)}
          >
            {/* Номер дня */}
            <span className="day-number">{day.dayNumber}</span>
            
            {/* Участники, выбравшие этот день */}
            {day.participants.length > 0 && (
              <div className="participants-list">
                {day.participants.slice(0, 3).map((participant, idx) => (
                  <UserAvatar
                    key={idx}
                    name={participant}
                    size="tiny"
                    className="participant-badge"
                    showTooltip={true}
                  />
                ))}
                {day.participants.length > 3 && (
                  <div className="participant-badge more">
                    +{day.participants.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;