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
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Загрузка...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-content">
        <div className="home-header">
          <h1>Chronos</h1>
          <button 
            className="logout-btn"
            onClick={handleLogout}
            title="Выйти из аккаунта"
          >
            Выйти
          </button>
        </div>

        {!showCreateForm && !createdMeeting && (
          <div className="home-actions">
            <button 
              className="action-card"
              onClick={handleShowCreateForm}
            >
              <span className="action-card-title">Запланировать новую встречу</span>
              <span className="action-card-description">Создайте встречу и пригласите участников</span>
            </button>
            <button 
              className="action-card"
              onClick={() => navigate('/my-meetings')}
            >
              <span className="action-card-title">Мои встречи</span>
              <span className="action-card-description">Посмотреть список ваших встреч</span>
            </button>
          </div>
        )}

        {showCreateForm && (
          <div className="create-form-card">
            <h2>Создание встречи</h2>
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
                  autoFocus
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
                  {isCreating ? 'Создаем...' : 'Создать встречу'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Результат создания встречи */}
        {createdMeeting && (
          <div className="created-card">
            <h2>Встреча создана</h2>
            
            <div className="invite-section">
              <label>Ссылка для приглашения участников:</label>
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
                  Копировать
                </button>
              </div>
            </div>

            <div className="form-actions">
              <button 
                className="cancel-btn"
                onClick={() => {
                  setCreatedMeeting(null);
                  setMeetingTitle('');
                  setMeetingDescription('');
                }}
              >
                Назад
              </button>
              <button 
                className="submit-btn"
                onClick={() => navigate(`/meeting/${createdMeeting.shareToken}`)}
              >
                Перейти к планированию
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
