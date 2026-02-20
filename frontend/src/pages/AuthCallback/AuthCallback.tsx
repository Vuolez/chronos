import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import './AuthCallback.css';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Получение токена...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isProcessing = false;
    
    const handleYandexCallback = async () => {
      if (isProcessing) {
        console.log('⚠️ AuthCallback: Обработка уже идет, пропускаем дубликат');
        return;
      }
      isProcessing = true;
      try {
        console.log('🔍 AuthCallback: Обработка callback от Яндекса');
        console.log('🔗 Текущий URL:', window.location.href);
        console.log('🔗 Hash:', window.location.hash);
        console.log('🔗 Search:', window.location.search);
        
        // Получаем токен из URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        console.log('📝 Hash параметры:', Object.fromEntries(hashParams));
        
        // Получаем токен из URL search (query params)
        const searchParams = new URLSearchParams(window.location.search);
        console.log('📝 Search параметры:', Object.fromEntries(searchParams));
        
        // Пробуем найти токен в разных местах
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        
        if (!accessToken) {
          console.log('❌ AuthCallback: Токен не найден в URL');
          console.log('❌ Проверьте правильность redirect_uri в настройках приложения Яндекса');
          setError('Токен не получен от Яндекса. Проверьте настройки приложения.');
          
          // Показываем ошибку на 5 секунд, потом перенаправляем
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 5000);
          return;
        }

        console.log('✅ AuthCallback: Токен получен от Яндекса:', accessToken.substring(0, 10) + '...');
        setStatus('Обмен токена на JWT...');

        // Отправляем токен на наш бэкенд для обмена на JWT
        const response = await authApi.login({
          yandexToken: accessToken
        });

        console.log('✅ AuthCallback: JWT получен от бэкенда');
        setStatus('Авторизация завершена, перенаправление...');
        
        // Уведомляем App.tsx об изменении состояния авторизации
        console.log('📢 AuthCallback: Отправляем событие auth-changed');
        window.dispatchEvent(new CustomEvent('auth-changed'));
        
        // Обновляем глобальную функцию если она есть
        if ((window as any).updateAuthState) {
          console.log('🔄 AuthCallback: Вызываем updateAuthState');
          (window as any).updateAuthState();
        }
        
        // Проверяем состояние токена
        console.log('🔍 AuthCallback: Проверяем JWT в localStorage:', !!localStorage.getItem('jwt_token'));
        console.log('🔍 AuthCallback: authApi.isAuthenticated():', authApi.isAuthenticated());
        
        // Определяем куда перенаправить после авторизации
        const returnTo = sessionStorage.getItem('auth_return_to');
        sessionStorage.removeItem('auth_return_to');
        
        const isValidReturnTo = returnTo &&
          returnTo.startsWith('/') &&
          !returnTo.includes('//') &&
          returnTo.length <= 500;
        
        const redirectPath = isValidReturnTo ? returnTo : '/';
        console.log('🚀 AuthCallback: Навигация на', redirectPath);
        
        // Небольшая задержка для обновления состояния
        setTimeout(() => {
          navigate(redirectPath, { replace: true });
        }, 100);
        
      } catch (err) {
        console.error('❌ AuthCallback: Ошибка авторизации:', err);
        setError(err instanceof Error ? err.message : 'Ошибка авторизации');
        
        // При ошибке перенаправляем обратно на страницу авторизации
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 3000);
      } finally {
        isProcessing = false;
      }
    };

    handleYandexCallback();
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h2>🔐 Обработка авторизации</h2>
        <p style={{ marginBottom: '20px' }}>{status}</p>
        
        {error && (
          <div style={{
            background: 'rgba(255, 0, 0, 0.2)',
            border: '1px solid rgba(255, 0, 0, 0.5)',
            borderRadius: '8px',
            padding: '15px',
            marginTop: '20px'
          }}>
            <p style={{ color: '#ffcccb', margin: 0 }}>❌ {error}</p>
            <p style={{ fontSize: '14px', margin: '10px 0 0 0', opacity: 0.8 }}>
              Перенаправление на страницу авторизации...
            </p>
          </div>
        )}
        
        {!error && (
          <div style={{ marginTop: '20px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback; 