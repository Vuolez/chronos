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

      // Перенаправляем на страницу планирования
      navigate(`/meeting/${shareToken}`, { replace: true });

    } catch (err) {
      console.error('Ошибка присоединения к встрече:', err);
      setError('Не удалось присоединиться к встрече');
    } finally {
      setIsJoining(false);
    }
  };

  // Обработчик входа в систему
  const handleLogin = () => {
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="invite-page">
        <div className="invite-container">
          <div className="loading">
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
        <div className="invite-container">
          <div className="error">
            <h2>❌ Ошибка</h2>
            <p>{error || 'Встреча не найдена'}</p>
            <button 
              className="home-btn"
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
      <div className="invite-container">
        <div className="meeting-info">
          <h1>Планирование встречи</h1>
          
          <div className="meeting-details">
            <h2>{meetingData.meeting.title}</h2>
            
            {meetingData.meeting.createdBy && (
              <div className="creator-info">
                <p><strong>Организатор:</strong> {meetingData.meeting.createdBy.name}</p>
              </div>
            )}

          </div>

          <div className="join-section">
            {currentUser ? (
              <div className="user-join">
                
                <button 
                  className="join-btn"
                  onClick={handleJoinMeeting}
                  disabled={isJoining}
                >
                  {isJoining ? '⏳ Присоединяемся...' : 'Присоединиться к планированию'}
                </button>
                
                {error && (
                  <p className="error-message">{error}</p>
                )}
              </div>
            ) : (
              <div className="guest-join">
                <h3>🔐 Необходима авторизация</h3>
                <p>Для участия во встрече необходимо войти в систему через Яндекс ID.</p>
                
                <button 
                  className="login-btn"
                  onClick={handleLogin}
                >
                  🚪 Войти через Яндекс ID
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;