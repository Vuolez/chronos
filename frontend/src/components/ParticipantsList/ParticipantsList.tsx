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
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  currentParticipantId
}) => {

  // Получение текста статуса на русском
  const getStatusText = (status: ParticipantStatus): string => {
    return status === ParticipantStatus.THINKING ? 'Думает' : 'Проголосовал';
  };

  // Получение CSS класса для статуса
  const getStatusClass = (status: ParticipantStatus): string => {
    return status === ParticipantStatus.THINKING ? 'thinking' : 'voted';
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

      <Instructions variant="sidebar" />
    </div>
  );
};

export default ParticipantsList;