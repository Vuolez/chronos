// Компонент списка участников
// Левая панель согласно iteration_1.md

import React from 'react';
import { Participant, ParticipantStatus } from '../../types';
import UserAvatar from '../UserAvatar';
import Instructions from '../Instructions';
import './ParticipantsList.css';

interface ParticipantsListProps {
  participants: Participant[];              // Список участников
  currentParticipantId?: string | null;     // ID текущего участника (если есть)
  inviteUrl?: string;                       // Ссылка для приглашения участников
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  currentParticipantId,
  inviteUrl
}) => {

  // Получение текста статуса на русском
  const getStatusText = (status: ParticipantStatus): string => {
    switch (status) {
      case ParticipantStatus.THINKING: return 'Думает';
      case ParticipantStatus.CHOOSEN_DATE: return 'Выбрал даты';
      case ParticipantStatus.VOTED: return 'Проголосовал';
      default: return 'Думает';
    }
  };

  // Получение CSS класса для статуса
  const getStatusClass = (status: ParticipantStatus): string => {
    switch (status) {
      case ParticipantStatus.THINKING: return 'thinking';
      case ParticipantStatus.CHOOSEN_DATE: return 'chosen-date';
      case ParticipantStatus.VOTED: return 'voted';
      default: return 'thinking';
    }
  };

  return (
    <div className="participants-list">
      <div className="participants-header">
        <h3>Участники</h3>
        <span className="participants-count">
          {participants.length} {participants.length === 1 ? 'участник' : 'участников'}
        </span>
      </div>

      {/* Список участников */}
      <div className="participants">
        {participants.map((participant) => (
          <div 
            key={participant.id} 
            className={`participant ${
              participant.id === currentParticipantId ? 'current' : ''
            }`}
          >
            <div className="participant-info">
              <UserAvatar 
                name={participant.name}
                size="medium"
                className="participant-avatar"
                showTooltip={true}
              />
              <div className="participant-details">
                <div className="participant-name">{participant.name}</div>
                <div className={`participant-status ${getStatusClass(participant.status)}`}>
                  {getStatusText(participant.status)}
                </div>
              </div>
            </div>
            
          </div>
        ))}

        {/* Пустое состояние */}
        {participants.length === 0 && (
          <div className="empty-state">
            <p>Загрузка участников...</p>
          </div>
        )}
      </div>

      <Instructions variant="sidebar" inviteUrl={inviteUrl} />
    </div>
  );
};

export default ParticipantsList;