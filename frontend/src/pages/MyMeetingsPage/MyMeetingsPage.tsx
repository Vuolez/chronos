import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetingApi } from '../../services/api';
import './MyMeetingsPage.css';

// Тип, соответствующий MyMeetingItem из бэкенда
interface MyMeetingItem {
  id: string;
  title: string;
  description?: string | null;
  shareToken: string;
  status: string;
  participantCount: number;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

const MyMeetingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MyMeetingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<MyMeetingItem | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const loadMeetings = useCallback(async () => {
    try {
      setError(null);
      const data = await meetingApi.getMyMeetings();
      setMeetings(data);
    } catch (err) {
      console.error('Ошибка загрузки встреч:', err);
      setError('Не удалось загрузить встречи');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const handleMeetingClick = (meeting: MyMeetingItem) => {
    setSelectedMeeting(meeting);
  };

  const handleCloseModal = () => {
    setSelectedMeeting(null);
  };

  const handleGoToMeeting = () => {
    if (selectedMeeting) {
      navigate(`/meeting/${selectedMeeting.shareToken}`);
    }
  };

  const handleLeaveMeeting = async () => {
    if (!selectedMeeting) return;

    const confirmed = window.confirm(
      `Вы уверены, что хотите выйти из встречи "${selectedMeeting.title}"?`
    );
    if (!confirmed) return;

    setIsLeaving(true);
    try {
      await meetingApi.leaveMeeting(selectedMeeting.id);
      setMeetings(prev => prev.filter(m => m.id !== selectedMeeting.id));
      setSelectedMeeting(null);
    } catch (err) {
      console.error('Ошибка выхода из встречи:', err);
      alert('Не удалось выйти из встречи. Попробуйте снова.');
    } finally {
      setIsLeaving(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'PLANNING': return 'Планирование';
      case 'VOTING': return 'Голосование';
      case 'COMPLETED': return 'Завершена';
      case 'CANCELED': return 'Отменена';
      default: return status;
    }
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'PLANNING': return 'status-planning';
      case 'VOTING': return 'status-voting';
      case 'COMPLETED': return 'status-completed';
      case 'CANCELED': return 'status-canceled';
      default: return '';
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="my-meetings-page">
        <div className="my-meetings-content">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Загрузка встреч...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-meetings-page">
      <div className="my-meetings-content">
        <div className="my-meetings-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            ← Назад
          </button>
          <h1>Мои встречи</h1>
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        {meetings.length === 0 && !error ? (
          <div className="empty-state">
            <p>У вас пока нет встреч</p>
            <button
              className="create-meeting-link"
              onClick={() => navigate('/')}
            >
              Создать первую встречу
            </button>
          </div>
        ) : (
          <div className="meetings-list">
            {meetings.map(meeting => (
              <div
                key={meeting.id}
                className="meeting-card"
                onClick={() => handleMeetingClick(meeting)}
              >
                <div className="meeting-card-header">
                  <h3 className="meeting-card-title">{meeting.title}</h3>
                  <span className={`meeting-status ${getStatusClass(meeting.status)}`}>
                    {getStatusLabel(meeting.status)}
                  </span>
                </div>
                {meeting.description && (
                  <p className="meeting-card-description">{meeting.description}</p>
                )}
                <div className="meeting-card-footer">
                  <span className="meeting-card-date">
                    Создана: {formatDate(meeting.createdAt)}
                  </span>
                  <span className="meeting-card-participants">
                    Участников: {meeting.participantCount}
                  </span>
                  {meeting.createdByName && (
                    <span className="meeting-card-creator">
                      Автор: {meeting.createdByName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно с действиями */}
      {selectedMeeting && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{selectedMeeting.title}</h3>
            {selectedMeeting.description && (
              <p className="modal-description">{selectedMeeting.description}</p>
            )}
            <div className="modal-actions">
              <button
                className="modal-btn go-btn"
                onClick={handleGoToMeeting}
              >
                Перейти к встрече
              </button>
              <button
                className="modal-btn leave-btn"
                onClick={handleLeaveMeeting}
                disabled={isLeaving}
              >
                {isLeaving ? 'Выходим...' : 'Выйти из встречи'}
              </button>
              <button
                className="modal-btn cancel-btn"
                onClick={handleCloseModal}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyMeetingsPage;
