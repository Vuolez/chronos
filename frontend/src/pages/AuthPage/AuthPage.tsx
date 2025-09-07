import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import './AuthPage.css';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Прямая авторизация через Яндекс OAuth
  const handleYandexAuth = () => {
    const clientId = '3f41d27790434692b7f6a36bf3d4ad41';
    const redirectUri = encodeURIComponent('http://localhost:3000/auth/callback');
    const responseType = 'token';
    
    // Строим URL для авторизации (пока без scope)
    const authUrl = `https://oauth.yandex.ru/authorize?` +
      `response_type=${responseType}&` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `force_confirm=true`; // Принудительно показывать окно выбора аккаунта
    
    console.log('🔗 Авторизация через URL:', authUrl);
    
    // Мгновенный redirect без задержек
    window.location.href = authUrl;
  };

  // ТЕСТОВАЯ ФУНКЦИЯ - авторизация с тестовым токеном
  const handleTestAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Используем наш новый API для авторизации
      const response = await authApi.login({
        yandexToken: 'test-token'
      });

      console.log('✅ Авторизация успешна:', response.user);
      
      // Перенаправляем на главную страницу
      navigate('/', { replace: true });
      
    } catch (err) {
      console.error('❌ Ошибка авторизации:', err);
      setError(err instanceof Error ? err.message : 'Ошибка авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Добро пожаловать в Chronos</h1>
        <p>Войдите через Яндекс для продолжения</p>
        
        {/* Показываем ошибку если есть */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {/* Кастомная кнопка вместо SDK */}
        <button 
          className="yandex-auth-btn"
          onClick={handleYandexAuth}
          type="button"
          disabled={isLoading}
        >
          <div className="yandex-btn-content">
            <svg className="yandex-icon" viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c0 1.747-.892 3.168-2.394 3.168-.446 0-.892-.223-1.339-.446v5.79h-1.339V7.268c0-.892.223-1.339.669-1.339.446 0 .669.447.669.893v.446c.446-.669 1.115-1.115 1.784-1.115 1.561 0 2.95 1.338 2.95 2.007z" fill="currentColor"/>
            </svg>
            Войти через Яндекс
          </div>
        </button>
      </div>
    </div>
  );
};

export default AuthPage; 