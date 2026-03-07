// Страница планирования встречи
// Интегрирована с API бэкенда

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Calendar from '../../components/Calendar';
import Instructions from '../../components/Instructions';
import ParticipantsList from '../../components/ParticipantsList';
import TimeSlotPicker from '../../components/TimeSlotPicker';
import { useMeeting } from '../../hooks';
import { authApi } from '../../services/api';
import './MeetingPage.css';

const MeetingPage: React.FC = () => {
  const navigate = useNavigate();
  const { shareToken } = useParams<{ shareToken?: string }>();
  
  // Используем hook для управления встречей
  const {
    meeting,
    participants,
    availabilities,
    selectedDates,
    commonDates,
    commonAvailableTimeSlots,
    votes,
    currentParticipantId,
    isLoading,
    error,
    createMeeting,
    loadMeeting,
    toggleDateSelection,
    saveAvailabilityWithTimeSlots,
    removeAvailabilityForDate,
    castFinalVote,
    setCurrentParticipant,
    clearError,
    startAutoRefresh,
    stopAutoRefresh
  } = useMeeting();

  const [timePickerDate, setTimePickerDate] = useState<string | null>(null);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('Новая встреча');
  const [hasLoadedMeeting, setHasLoadedMeeting] = useState(false);
  const [autoRefreshActive, setAutoRefreshActive] = useState(false);

  // Загрузка встречи при монтировании
  useEffect(() => {
    if (shareToken && !hasLoadedMeeting) {
      // Загружаем существующую встречу по токену только один раз
      loadMeeting(shareToken).then(() => {
        setHasLoadedMeeting(true);
      });
    } else if (!shareToken && !hasLoadedMeeting) {
      // Если нет токена, показываем форму создания
      setIsCreatingMeeting(true);
      setHasLoadedMeeting(true); // Предотвращаем повторные вызовы
    }
  }, [shareToken, loadMeeting, hasLoadedMeeting]);

  // Автообновление данных встречи
  useEffect(() => {
    if (shareToken && hasLoadedMeeting && !isCreatingMeeting) {
      // Запускаем автообновление через 2 секунды после загрузки
      const timeoutId = setTimeout(() => {
        startAutoRefresh(shareToken, 5000); // Обновляем каждые 5 секунд
        setAutoRefreshActive(true);
      }, 2000);

      // Останавливаем автообновление при размонтировании
      return () => {
        clearTimeout(timeoutId);
        stopAutoRefresh();
        setAutoRefreshActive(false);
      };
    }
  }, [shareToken, hasLoadedMeeting, isCreatingMeeting, startAutoRefresh, stopAutoRefresh]);

  // Автоматическая установка текущего участника после загрузки
  useEffect(() => {
    console.log('🔍 useEffect участники: participants.length =', participants.length, 'currentParticipantId =', currentParticipantId);
    console.log('👥 Список участников:', participants.map(p => ({ 
      id: p.id, 
      name: p.name, 
      isAuthenticated: p.isAuthenticated,
      user: p.user,
      email: p.email 
    })));
    
    // Получаем текущего авторизованного пользователя для сравнения
    const getCurrentUser = async () => {
      try {
        const currentUser = await authApi.getCurrentUser();
        console.log('👤 Текущий авторизованный пользователь:', {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email
        });
        
        // Ищем участника с таким же user.id
        const matchingParticipant = participants.find(p => p.user?.id === currentUser.id);
        console.log('🔍 Участник соответствующий текущему пользователю:', matchingParticipant ? {
          id: matchingParticipant.id,
          name: matchingParticipant.name,
          userId: matchingParticipant.user?.id,
          email: matchingParticipant.email
        } : 'НЕ НАЙДЕН');
        
      } catch (error) {
        console.warn('⚠️ Не удалось получить текущего пользователя:', error);
      }
    };
    
    if (participants.length > 0 && !currentParticipantId) {
      getCurrentUser(); // Логируем для отладки
      
      // Получаем текущего пользователя для правильного сопоставления
      const setCurrentParticipantAsync = async () => {
        try {
          const currentUser = await authApi.getCurrentUser();
          
          // Находим участника который соответствует текущему пользователю по user.id
          const myParticipant = participants.find(p => p.user?.id === currentUser.id);
          
          if (myParticipant) {
            console.log('🔄 Устанавливаем СВОЕГО участника:', myParticipant.name, 'ID:', myParticipant.id);
            setCurrentParticipant(myParticipant.id);
          } else {
            // Fallback: ищем первого авторизованного участника
            const authenticatedParticipant = participants.find(p => p.isAuthenticated);
            if (authenticatedParticipant) {
              console.log('🔄 Fallback: Устанавливаем первого авторизованного участника:', authenticatedParticipant.name, 'ID:', authenticatedParticipant.id);
              setCurrentParticipant(authenticatedParticipant.id);
            } else if (participants.length === 1) {
              // Если только один участник, устанавливаем его как текущего
              console.log('🔄 Устанавливаем единственного участника:', participants[0].name, 'ID:', participants[0].id);
              setCurrentParticipant(participants[0].id);
            } else {
              console.warn('⚠️ Не найден подходящий участник для установки. Всего участников:', participants.length);
            }
          }
        } catch (error) {
          console.warn('⚠️ Ошибка получения текущего пользователя для установки участника:', error);
        }
      };
      
      setCurrentParticipantAsync();
    }
  }, [participants, currentParticipantId, setCurrentParticipant]);

  // Создание новой встречи
  const handleCreateMeeting = async () => {
    if (!meetingTitle.trim()) return;
    
    const newMeeting = await createMeeting({
      title: meetingTitle,
      description: 'Планирование встречи'
    });
    
    if (newMeeting) {
      setIsCreatingMeeting(false);
      // Обновляем URL с токеном встречи
      navigate(`/meeting/${newMeeting.shareToken}`, { replace: true });
    }
  };



  // Формируем данные для календаря - показываем доступности ВСЕХ участников
  const participantAvailabilities = availabilities
    .map(availability => ({
      date: availability.date,
      participantName: participants.find(p => p.id === availability.participantId)?.name || 'Участник'
    }));

  const handleGoBack = () => {
    navigate('/');
  };

  // Обработка ошибки
  const handleDismissError = () => {
    clearError();
  };

  // Форма создания встречи
  if (isCreatingMeeting) {
    return (
      <div className="meeting-page">
        <div className="create-meeting-form">
          <div className="form-content">
            <h2>Создание встречи</h2>
            <input
              type="text"
              placeholder="Название встречи"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              className="title-input"
              autoFocus
            />
            <div className="form-actions">
              <button 
                className="create-btn"
                onClick={handleCreateMeeting}
                disabled={!meetingTitle.trim() || isLoading}
              >
                {isLoading ? 'Создание...' : 'Создать встречу'}
              </button>
              <button 
                className="cancel-btn"
                onClick={handleGoBack}
                disabled={isLoading}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-page">
      {/* Ошибка */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={handleDismissError}>✕</button>
        </div>
      )}

      <div className="meeting-header">
        <button 
          className="back-btn"
          onClick={handleGoBack}
          disabled={isLoading}
        >
          ← Назад
        </button>
        <div className="header-info">
        </div>
      </div>

      <div className="meeting-content">
        {/* Левая панель - участники */}
        <div className="participants-panel">
          <ParticipantsList
            participants={participants}
            currentParticipantId={currentParticipantId}
            inviteUrl={shareToken ? `${window.location.origin}/meeting/${shareToken}` : undefined}
          />
        </div>

        {/* Центральная панель - календарь */}
        <div className="calendar-panel">
          <div className="meeting-header-title-block">
            <h1>{meeting?.title || 'Планирование встречи'}</h1>
            {meeting?.description && (
              <p className="meeting-header-description">{meeting.description}</p>
            )}
          </div>
          <Instructions
            variant="mobile"
            inviteUrl={shareToken ? `${window.location.origin}/meeting/${shareToken}` : undefined}
          />
          <Calendar
            selectedDates={selectedDates}
            onDateClick={toggleDateSelection}
            onOpenTimePicker={(date) => setTimePickerDate(date)}
            totalParticipants={participants.length}
            participantAvailabilities={participantAvailabilities}
          />

          {timePickerDate && currentParticipantId && (
            <TimeSlotPicker
              date={timePickerDate}
              initialSlots={(() => {
                const a = availabilities.find(
                  av => av.participantId === currentParticipantId && av.date === timePickerDate
                );
                if (!a) return []; // новый день — пустые слоты
                const slots = a.timeSlots;
                if (!slots || slots.length === 0) return Array.from({ length: 48 }, (_, i) => i); // весь день
                return slots;
              })()}
              onSave={(date, slots) => {
                saveAvailabilityWithTimeSlots(currentParticipantId, date, slots);
              }}
              onClose={() => setTimePickerDate(null)}
              onRemove={() => {
                if (currentParticipantId) {
                  removeAvailabilityForDate(currentParticipantId, timePickerDate);
                }
                setTimePickerDate(null);
              }}
              onClearDay={() => {
                if (currentParticipantId) {
                  removeAvailabilityForDate(currentParticipantId, timePickerDate);
                }
              }}
              hasExistingAvailability={!!availabilities.find(
                av => av.participantId === currentParticipantId && av.date === timePickerDate
              )}
              participants={participants}
              currentParticipantId={currentParticipantId}
              participantAvailabilities={availabilities
                .filter(a => a.date === timePickerDate)
                .map(a => {
                  const slots = a.timeSlots;
                  const timeSlots =
                    !slots || slots.length === 0
                      ? Array.from({ length: 48 }, (_, i) => i)
                      : slots;
                  return {
                    participantId: a.participantId,
                    participantName:
                      participants.find(p => p.id === a.participantId)?.name ?? 'Участник',
                    timeSlots
                  };
                })}
            />
          )}
          
          {/* Голосование за финальную дату */}
          {commonAvailableTimeSlots.length > 0 && (
            <>
              <div className="final-vote-section">
                <h3>Голосование за финальную дату</h3>
                <div className="vote-dates-list">
                  {(() => {
                    const voteCountsByDate = new Map<string, number>();
                    const voteCountsBySlot = new Map<string, number>();
                    const norm = (t: string | undefined) => t?.slice(0, 5) ?? '';

                    for (const v of votes) {
                      voteCountsByDate.set(v.votedDate, (voteCountsByDate.get(v.votedDate) || 0) + 1);
                      if (v.timeStart != null && v.timeEnd != null) {
                        const key = `${v.votedDate}_${norm(v.timeStart)}_${norm(v.timeEnd)}`;
                        voteCountsBySlot.set(key, (voteCountsBySlot.get(key) || 0) + 1);
                      }
                    }

                    const currentUserVote = votes.find(v => v.participantId === currentParticipantId);
                    const uniqueDates = Array.from(new Set(commonAvailableTimeSlots.map(s => s.date))).sort();
                    const sortedDates = [...uniqueDates].sort((a, b) => {
                      return (voteCountsByDate.get(b) || 0) - (voteCountsByDate.get(a) || 0);
                    });

                    return sortedDates.map(date => {
                      const slotsForDate = commonAvailableTimeSlots.filter(s => s.date === date);
                      const dateCount = voteCountsByDate.get(date) || 0;
                      const isDateSelected = currentUserVote?.votedDate === date && currentUserVote?.timeStart == null && currentUserVote?.timeEnd == null;
                      return (
                        <div key={date} className="vote-date-block">
                          <button
                            className={`vote-date-btn ${isDateSelected ? 'vote-date-selected' : ''}`}
                            onClick={() => castFinalVote(date)}
                          >
                            <span className="vote-date-label">
                              {new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                              })}
                            </span>
                            {dateCount > 0 && (
                              <span className="vote-count">{dateCount}</span>
                            )}
                          </button>
                        {slotsForDate.length > 0 && (() => {
                          const isWholeDay = (s: { startTime: string; endTime: string }) =>
                            norm(s.startTime) === '00:00' && (norm(s.endTime) === '23:30' || norm(s.endTime) === '23:59');
                          const slotsToShow = slotsForDate.filter(s => !isWholeDay(s));
                          if (slotsToShow.length === 0) return null;
                          return (
                          <div className="vote-time-ranges">
                            {slotsToShow.map((slot, idx) => {
                                const slotKey = `${date}_${norm(slot.startTime)}_${norm(slot.endTime)}`;
                                const slotCount = voteCountsBySlot.get(slotKey) || 0;
                                const isSlotSelected =
                                  currentUserVote?.votedDate === date &&
                                  norm(currentUserVote?.timeStart) === norm(slot.startTime) &&
                                  norm(currentUserVote?.timeEnd) === norm(slot.endTime);
                                return (
                                  <button
                                    key={`${slot.startTime}-${slot.endTime}-${idx}`}
                                    className={`vote-time-btn ${isSlotSelected ? 'vote-time-selected' : ''}`}
                                    onClick={() =>
                                      castFinalVote(date, slot.startTime, slot.endTime)
                                    }
                                  >
                                    {slot.startTime.slice(0, 5)} – {slot.endTime.slice(0, 5)}
                                    {slotCount > 0 && (
                                      <span className="vote-time-count">{slotCount}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Финальная дата — показывается, когда все проголосовали */}
              {(() => {
                const allHaveVoted = participants.length > 0 && participants.every(p => votes.some(v => v.participantId === p.id));
                if (!allHaveVoted || votes.length === 0) return null;

                const norm = (t: string | undefined) => t?.slice(0, 5) ?? '';
                const byKey = new Map<string, { count: number; date: string; timeStart?: string; timeEnd?: string }>();

                for (const v of votes) {
                  if (v.timeStart != null && v.timeEnd != null) {
                    const key = `slot:${v.votedDate}_${norm(v.timeStart)}_${norm(v.timeEnd)}`;
                    const cur = byKey.get(key) || { count: 0, date: v.votedDate, timeStart: v.timeStart, timeEnd: v.timeEnd };
                    cur.count++;
                    byKey.set(key, cur);
                  } else {
                    const key = `date:${v.votedDate}`;
                    const cur = byKey.get(key) || { count: 0, date: v.votedDate };
                    cur.count++;
                    byKey.set(key, cur);
                  }
                }

                const entries = Array.from(byKey.values());
                const winner = entries.reduce<{ count: number; date: string; timeStart?: string; timeEnd?: string } | null>(
                  (best, cur) => (cur.count > (best?.count ?? 0) ? cur : best),
                  null
                );

                if (!winner || winner.count === 0) return null;

                const dateStr = new Date(winner.date + 'T00:00:00').toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                });
                const isWholeDayWinner = winner.timeStart != null && winner.timeEnd != null &&
                  norm(winner.timeStart) === '00:00' && (norm(winner.timeEnd) === '23:30' || norm(winner.timeEnd) === '23:59');
                const timeStr = winner.timeStart != null && winner.timeEnd != null && !isWholeDayWinner
                  ? `${norm(winner.timeStart)} – ${norm(winner.timeEnd)}`
                  : null;

                return (
                  <div className="final-date-result">
                    <h3>Финальная дата</h3>
                    <div className="final-date-value">
                      {dateStr}
                      {timeStr != null && <span className="final-date-time">{timeStr}</span>}
                    </div>
                    <div className="final-date-votes">
                      {winner.count} {(() => {
                        const n = winner.count;
                        if (n % 10 === 1 && n % 100 !== 11) return 'голос';
                        if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'голоса';
                        return 'голосов';
                      })()}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
          
          {/* Если нет общих дат, но есть участники */}
          {commonDates.length === 0 && participants.length > 1 && (
            <div className="no-common-dates">
              <p>Участникам нужно выбрать больше дат, чтобы найти пересечения</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingPage;