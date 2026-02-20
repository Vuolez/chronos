// Страница приглашения во встречу
// Показывает информацию о встрече и позволяет присоединиться

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { meetingApi, authApi } from '../../services/api';
import { Meeting, MeetingDetail, UserInfo } from '../../types';
import './InvitePage.css';

const InvitePage: React.FC = () => {
  const navigate = useNavigate();
  const { shareToken } = useParams<{ shareToken: string }>();
  
  const [meetingData, setMeetingData] = useState<MeetingDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных встречи и проверка авторизации
  useEffect(() => {
    const loadData = async () => {
      if (!shareToken) {
        setError('Неверная ссылка на встречу');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Загружаем информацию о встрече
        const data = await meetingApi.getMeetingByShareToken(shareToken);
        setMeetingData(data);

        // Проверяем авторизацию пользователя
        try {
          const userData = await authApi.getCurrentUser();
          setCurrentUser(userData);
        } catch (authError) {
          // Пользователь не авторизован - это нормально для страницы приглашения
          console.log('Пользователь не авторизован:', authError);
        }

      } catch (err) {
        console.error('Ошибка загрузки встречи:', err);
        setError('Встреча не найдена или недоступна');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [shareToken]);

  // Обработчик присоединения к встрече
  const handleJoinMeeting = async () => {
    if (!meetingData || !currentUser) return;

    try {
      setIsJoining(true);
      setError(null);

      // Добавляем пользователя как участника встречи
      await meetingApi.addParticipant(meetingData.meeting.id, {
        name: currentUser.name,
        email: currentUser.email
      });

      // Перенаправляем на страницу планирования (joined=1 — пропустить проверку в MeetingRouter)
      navigate(`/meeting/${shareToken}?joined=1`, { replace: true });

    } catch (err) {
      console.error('Ошибка присоединения к встрече:', err);
      setError('Не удалось присоединиться к встрече');
    } finally {
      setIsJoining(false);
    }
  };

  // Обработчик входа в систему (передаём returnTo для редиректа после авторизации)
  const handleLogin = () => {
    const returnTo = encodeURIComponent(window.location.pathname);
    navigate(`/auth?returnTo=${returnTo}`);
  };

  if (isLoading) {
    return (
      <div className="invite-page">
        <div className="invite-content">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Загрузка информации о встрече...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !meetingData) {
    return (
      <div className="invite-page">
        <div className="invite-content">
          <div className="invite-header">
            <h1>Ошибка</h1>
          </div>
          <div className="invite-card">
            <p className="invite-error-text">{error || 'Встреча не найдена'}</p>
            <button 
              className="invite-btn-secondary"
              onClick={() => navigate('/')}
            >
              На главную
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page">
      <div className="invite-content">
        <div className="invite-header">
          <h1>Приглашение</h1>
        </div>

        <div className="invite-card">
          <div className="invite-card-header">
            <h3 className="invite-card-title">{meetingData.meeting.title}</h3>
            <span className="invite-status">Планирование</span>
          </div>
          
          {meetingData.meeting.createdBy && (
            <div className="invite-card-meta">
              Организатор: {meetingData.meeting.createdBy.name}
            </div>
          )}
        </div>

        <div className="invite-actions">
          {currentUser ? (
            <>
              <button 
                className="invite-btn-primary"
                onClick={handleJoinMeeting}
                disabled={isJoining}
              >
                {isJoining ? 'Присоединяемся...' : 'Присоединиться к планированию'}
              </button>
              
              {error && (
                <div className="invite-error">{error}</div>
              )}
            </>
          ) : (
            <>
              <div className="invite-card">
                <p className="invite-login-text">Для участия во встрече необходимо войти в систему через Яндекс ID.</p>
              </div>
              <button 
                className="invite-btn-primary"
                onClick={handleLogin}
              >
                Войти через Яндекс ID
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
