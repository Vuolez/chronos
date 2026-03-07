// Компонент календаря для выбора дат
// При клике по дню сразу открывается окно выбора времени (TimeSlotPicker)

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
  selectedDates: string[];
  onDateClick: (date: string) => void;
  onOpenTimePicker?: (date: string) => void;
  totalParticipants?: number;
  participantAvailabilities?: Array<{
    date: string;
    participantName: string;
  }>;
}

const Calendar: React.FC<CalendarProps> = ({
  selectedDates,
  onDateClick,
  onOpenTimePicker,
  totalParticipants = 0,
  participantAvailabilities = []
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const calendarDays = getCalendarDays(currentYear, currentMonth, []);
  const daysWithParticipants = addParticipantsToCalendarDays(
    calendarDays, 
    participantAvailabilities
  );
  const daysWithSelection = daysWithParticipants.map(day => ({
    ...day,
    isSelectedByCurrentUser: selectedDates.includes(day.date)
  }));

  const handlePreviousMonth = () => {
    const { year, month } = getPreviousMonth(currentYear, currentMonth);
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const handleNextMonth = () => {
    const { year, month } = getNextMonth(currentYear, currentMonth);
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const handleDayCellClick = (day: CalendarDay, e: React.MouseEvent) => {
    if (!day.isCurrentMonth) return;
    e.stopPropagation();
    onDateClick(day.date);
    if (onOpenTimePicker) {
      onOpenTimePicker(day.date);
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
            } ${
              totalParticipants > 0 && day.participants.length === totalParticipants ? 'all-voted' : ''
            }`}
            onClick={(e) => handleDayCellClick(day, e)}
          >
            {/* Номер дня */}
            <span className="day-number">{day.dayNumber}</span>

            {/* Участники, выбравшие этот день */}
            {day.participants.length > 0 && (
                <div className="day-participants-area">
                  <div className="participants-avatars">
                    {day.participants.map((participant, idx) => {
                      const count = day.participants.length;
                      const fraction = count === 1 ? 0 : idx / (count - 1);
                      return (
                        <div
                          key={idx}
                          className="avatar-position"
                          style={{
                            left: count === 1 ? '0' : `calc(${fraction * 100}% - var(--avatar-size) * ${fraction})`,
                            zIndex: idx,
                          }}
                        >
                          <UserAvatar
                            name={participant}
                            size="tiny"
                            className="participant-badge"
                            showTooltip={true}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {totalParticipants > 0 && (
                    <div className="day-vote-count">
                      {day.participants.length}/{totalParticipants}
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