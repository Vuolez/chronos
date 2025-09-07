// Умный роутер для встреч
// Решает куда направить пользователя: в календарь или на страницу приглашения

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { meetingApi, authApi } from '../../services/api';
import MeetingPage from '../../pages/MeetingPage';
import InvitePage from '../../pages/InvitePage';

const MeetingRouter: React.FC = () => {
  const navigate = useNavigate();
  const { shareToken } = useParams<{ shareToken: string }>();
  
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowInvite, setShouldShowInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('🔄 MeetingRouter render: shareToken =', shareToken);

  useEffect(() => {
    const checkAccess = async () => {
      if (!shareToken) {
        setError('Неверная ссылка на встречу');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Проверяем авторизацию
        const isAuthenticated = authApi.isAuthenticated();
        console.log('🔍 MeetingRouter: Проверка авторизации:', isAuthenticated);
        
        if (!isAuthenticated) {
          // Не авторизован - показываем страницу приглашения
          console.log('❌ MeetingRouter: Пользователь не авторизован, показываем приглашение');
          setShouldShowInvite(true);
          setIsLoading(false);
          return;
        }

        // Получаем информацию о встрече
        console.log('📋 MeetingRouter: Загружаем информацию о встрече:', shareToken);
        const meetingData = await meetingApi.getMeetingByShareToken(shareToken);
        console.log('✅ MeetingRouter: Встреча загружена:', meetingData);
        
        // Извлекаем ID встречи из ответа
        const meetingId = meetingData.meeting.id;
        console.log('🔍 MeetingRouter: Извлеченный meetingId:', meetingId);
        
        if (!meetingId) {
          console.error('❌ MeetingRouter: Не удалось получить ID встречи');
          setShouldShowInvite(true);
          setIsLoading(false);
          return;
        }
        
        // Проверяем участие пользователя
        console.log('🔍 MeetingRouter: Проверяем участие для meetingId:', meetingId);
        const participationInfo = await meetingApi.checkParticipation(meetingId);
        console.log('📊 MeetingRouter: Результат проверки участия:', participationInfo);
        
        if (participationInfo.isParticipant) {
          // Пользователь уже участник - показываем календарь
          console.log('✅ MeetingRouter: Пользователь участник, показываем календарь');
          setShouldShowInvite(false);
        } else {
          // Пользователь не участник - показываем приглашение
          console.log('❌ MeetingRouter: Пользователь НЕ участник, показываем приглашение');
          setShouldShowInvite(true);
        }

      } catch (err) {
        console.error('❌ MeetingRouter: Ошибка проверки доступа к встрече:', err);
        // В случае ошибки показываем страницу приглашения
        setShouldShowInvite(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [shareToken]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <p>Проверяем доступ к встрече...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>❌ Ошибка</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>На главную</button>
      </div>
    );
  }

  // Показываем нужный компонент
  return shouldShowInvite ? <InvitePage /> : <MeetingPage />;
};

export default MeetingRouter;