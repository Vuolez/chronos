import React, { useState } from 'react';
import { feedbackApi } from '../../services/api';
import './FeedbackForm.css';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError('Пожалуйста, введите сообщение');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await feedbackApi.submitFeedback({
        message: trimmedMessage,
        phoneNumber: phoneNumber.trim() || undefined
      });
      setMessage('');
      setPhoneNumber('');
      onClose();
      alert('Спасибо! Ваше сообщение отправлено.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить сообщение');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="feedback-modal-overlay" onClick={handleOverlayClick}>
      <div className="feedback-modal-content">
        <h2 className="feedback-modal-title">Обратная связь</h2>
        <p className="feedback-modal-description">
          Если есть вопросы или предложения, можете оставить сообщение.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="feedback-form-group">
            <label htmlFor="feedback-message">Сообщение *</label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите ваш вопрос или предложение..."
              rows={4}
              maxLength={2000}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="feedback-form-group">
            <label htmlFor="feedback-phone">Телефон (не обязательно)</label>
            <input
              id="feedback-phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              maxLength={50}
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="feedback-form-error">{error}</p>}

          <div className="feedback-form-actions">
            <button
              type="button"
              className="feedback-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="feedback-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;
