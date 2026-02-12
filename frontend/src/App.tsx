import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MeetingPage from './pages/MeetingPage';
import MyMeetingsPage from './pages/MyMeetingsPage';
import InvitePage from './pages/InvitePage';
import MeetingRouter from './components/MeetingRouter';
import AuthPage from './pages/AuthPage';
import AuthCallback from './pages/AuthCallback/AuthCallback';
import { authApi } from './services/api';
import './App.css';

function App() {
  // Состояние авторизации
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Теперь проверяем JWT токен
    return authApi.isAuthenticated();
  });

  // Проверяем изменения токена
  useEffect(() => {
    const handleStorageChange = () => {
      // Используем метод API для проверки авторизации
      const hasToken = authApi.isAuthenticated();
      setIsAuthenticated(hasToken);
    };

    // Глобальная функция для прямого обновления
    (window as any).updateAuthState = handleStorageChange;

    // Слушаем кастомное событие от AuthCallback
    window.addEventListener('auth-changed', handleStorageChange);
    
    // Слушаем изменения localStorage в других вкладках
    window.addEventListener('storage', handleStorageChange);
    
    // Слушаем focus для надежности
    window.addEventListener('focus', handleStorageChange);

    return () => {
      delete (window as any).updateAuthState;
      window.removeEventListener('auth-changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  console.log('🖥️ App render: isAuthenticated =', isAuthenticated, 'path =', window.location.pathname);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Главная страница - только для авторизованных */}
          <Route 
            path="/" 
            element={isAuthenticated ? <HomePage /> : <Navigate to="/auth" replace />} 
          />
          
          {/* Страница авторизации */}
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Callback от Яндекс OAuth */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Мои встречи - только для авторизованных */}
          <Route 
            path="/my-meetings" 
            element={isAuthenticated ? <MyMeetingsPage /> : <Navigate to="/auth" replace />} 
          />
          
          {/* Страница создания встречи - только для авторизованных */}
          <Route 
            path="/create-meeting" 
            element={isAuthenticated ? <MeetingPage /> : <Navigate to="/auth" replace />} 
          />
          
          {/* Умный роутер встреч - автоматически определяет куда направить */}
          <Route 
            path="/meeting/:shareToken" 
            element={<MeetingRouter />} 
          />
          
          {/* Прямая ссылка на приглашение (для шаринга) */}
          <Route 
            path="/invite/:shareToken" 
            element={<InvitePage />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
