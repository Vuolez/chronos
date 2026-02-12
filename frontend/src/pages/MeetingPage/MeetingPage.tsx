// Страница планирования встречи
// Интегрирована с API бэкенда

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Calendar from '../../components/Calendar';
import ParticipantsList from '../../components/ParticipantsList';
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
    votes,
    currentParticipantId,
    isLoading,
    error,
    createMeeting,
    loadMeeting,
    toggleDateSelection,
    castFinalVote,
    setCurrentParticipant,
    clearError,
    startAutoRefresh,
    stopAutoRefresh
  } = useMeeting();

  // Состояние создания встречи
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
        <h1>{meeting?.title || 'Планирование встречи'}</h1>
        <div className="header-info">
        </div>
      </div>

      {/* Индикатор загрузки убран чтобы избежать прыжков разметки при выборе дат */}

      <div className="meeting-content">
        {/* Левая панель - участники */}
        <div className="participants-panel">
          <ParticipantsList
            participants={participants}
            currentParticipantId={currentParticipantId}
          />
        </div>

        {/* Центральная панель - календарь */}
        <div className="calendar-panel">
          <Calendar
            selectedDates={selectedDates}
            onDateClick={toggleDateSelection}
            totalParticipants={participants.length}
            participantAvailabilities={participantAvailabilities}
          />
          
          {/* Голосование за финальную дату */}
          {commonDates.length > 0 && (
            <div className="final-vote-section">
              <h3>Голосование за финальную дату</h3>
              <div className="vote-dates-list">
                {(() => {
                  // Считаем голоса для каждой общей даты
                  const voteCounts = new Map<string, number>();
                  for (const v of votes) {
                    voteCounts.set(v.votedDate, (voteCounts.get(v.votedDate) || 0) + 1);
                  }

                  // Текущий голос пользователя
                  const currentUserVote = votes.find(v => v.participantId === currentParticipantId);

                  // Сортируем: сначала с наибольшим числом голосов
                  const sortedDates = [...commonDates].sort((a, b) => {
                    return (voteCounts.get(b) || 0) - (voteCounts.get(a) || 0);
                  });

                  return sortedDates.map(date => {
                    const count = voteCounts.get(date) || 0;
                    const isSelected = currentUserVote?.votedDate === date;
                    return (
                      <button
                        key={date}
                        className={`vote-date-btn ${isSelected ? 'vote-date-selected' : ''}`}
                        onClick={() => castFinalVote(date)}
                      >
                        <span className="vote-date-label">
                          {new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })}
                        </span>
                        {count > 0 && (
                          <span className="vote-count">{count}</span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
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