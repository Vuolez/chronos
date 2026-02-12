// Главная страница приложения
// Соответствует требованию: "пустая страница где есть одна кнопка"

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, meetingApi } from '../../services/api';
import { UserInfo, CreateMeetingRequest } from '../../types/api';
import './HomePage.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [createdMeeting, setCreatedMeeting] = useState<any>(null);

  // Загружаем информацию о пользователе при загрузке страницы
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const userInfo = await authApi.getCurrentUser();
        setUser(userInfo);
        console.log('👤 Информация о пользователе:', userInfo);
      } catch (error) {
        console.error('❌ Ошибка загрузки пользователя:', error);
        // Если не удалось получить пользователя - перенаправляем на авторизацию
        navigate('/auth', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserInfo();
  }, [navigate]);

  const handleShowCreateForm = () => {
    setShowCreateForm(true);
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!meetingTitle.trim()) {
      alert('Пожалуйста, введите название встречи');
      return;
    }

    setIsCreating(true);
    
    try {
      const request: CreateMeetingRequest = {
        title: meetingTitle.trim(),
        description: meetingDescription.trim() || undefined
      };

      const meeting = await meetingApi.createMeeting(request);
      console.log('✅ Встреча создана:', meeting);
      
      // Сохраняем созданную встречу для отображения ссылки
      setCreatedMeeting(meeting);
      setShowCreateForm(false);
      
    } catch (error) {
      console.error('❌ Ошибка создания встречи:', error);
      alert('Ошибка создания встречи. Попробуйте снова.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setMeetingTitle('');
    setMeetingDescription('');
  };

  const handleLogout = async () => {
    try {
      // Используем API для выхода
      await authApi.logout();
      
      // Отправляем событие обновления авторизации
      window.dispatchEvent(new CustomEvent('auth-changed'));
      
      // Перенаправляем на страницу авторизации
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('❌ Ошибка выхода:', error);
      // Даже если произошла ошибка - все равно выходим
      localStorage.removeItem('jwt_token');
      navigate('/auth', { replace: true });
    }
  };

  if (isLoading) {
    return (
      <div className="home-page">
        <div className="home-content">
          <h1>⏳ Загрузка...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Кнопка выхода в правом верхнем углу */}
      <button 
        className="logout-btn"
        onClick={handleLogout}
        title="Выйти из аккаунта"
      >
        Выйти
      </button>

      <div className="home-content">
        <div className="main-content">
          <h2>Chronos</h2>
          <p className="app-subtitle">Планирование встреч стало проще</p>
          
          {!showCreateForm ? (
            <div className="home-buttons">
              <button 
                className="create-meeting-btn"
                onClick={handleShowCreateForm}
              >
                Запланировать новую встречу
              </button>
              <button 
                className="my-meetings-btn"
                onClick={() => navigate('/my-meetings')}
              >
                Мои встречи
              </button>
            </div>
          ) : (
            <div className="create-meeting-form">
              <form onSubmit={handleCreateMeeting}>
                <div className="form-group">
                  <label htmlFor="meetingTitle">Название встречи *</label>
                  <input
                    type="text"
                    id="meetingTitle"
                    value={meetingTitle}
                    onChange={(e) => setMeetingTitle(e.target.value)}
                    placeholder="Например: Команда планирование"
                    required
                    maxLength={255}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="meetingDescription">Описание (опционально)</label>
                  <textarea
                    id="meetingDescription"
                    value={meetingDescription}
                    onChange={(e) => setMeetingDescription(e.target.value)}
                    placeholder="Опишите цель встречи..."
                    rows={3}
                    maxLength={1000}
                  />
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={handleCancelCreate}
                    disabled={isCreating}
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isCreating}
                  >
                    {isCreating ? '⏳ Создаем...' : 'Создать встречу'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Результат создания встречи */}
          {createdMeeting && (
            <div className="meeting-created">
              <h3>Встреча успешно создана!</h3>
              
              <div className="meeting-actions">
                
                <div className="invite-section">
                  <p><strong>Ссылка для приглашения участников:</strong></p>
                  <div className="invite-link">
                    <input 
                      type="text" 
                      value={`${window.location.origin}/invite/${createdMeeting.shareToken}`}
                      readOnly
                      className="invite-url"
                    />
                    <button 
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/invite/${createdMeeting.shareToken}`);
                        alert('Ссылка скопирована!');
                      }}
                    >
                      📋 Копировать
                    </button>
                  </div>
                </div>

                <button 
                  className="go-to-calendar-btn"
                  onClick={() => navigate(`/meeting/${createdMeeting.shareToken}`)}
                >
                  Перейти к планированию
                </button>
                
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;