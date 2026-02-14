// Общий компонент инструкции «Как это работает»
// Используется в боковой панели (десктоп) и над календарём (мобильные)

import React, { useState } from 'react';
import './Instructions.css';

interface InstructionsProps {
  /** Вариант отображения: sidebar — в панели участников, mobile — над календарём */
  variant: 'sidebar' | 'mobile';
  /** Ссылка для приглашения участников (если есть — показывается кнопка) */
  inviteUrl?: string;
}

const Instructions: React.FC<InstructionsProps> = ({ variant, inviteUrl }) => {
  const [copied, setCopied] = useState(false);

  const handleInviteClick = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`instructions instructions--${variant}`}>
      <h4>Как это работает:</h4>
      <ol>
        <li>Выберите подходящие вам даты</li>
        <li>После того как все участники сделают выбор, система найдёт удобные для всех даты</li>
        <li>Вам останется только проголосовать за финальную дату</li>
      </ol>
      {inviteUrl && (
        <button
          type="button"
          className="instructions-invite-btn"
          onClick={handleInviteClick}
        >
          {copied ? 'Ссылка скопирована!' : 'Пригласить участников'}
        </button>
      )}
    </div>
  );
};

export default Instructions;
