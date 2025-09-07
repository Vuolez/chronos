-- Добавление связи участников с пользователями
-- V6__Add_user_id_to_participants.sql

-- Добавляем колонку user_id в таблицу participants
ALTER TABLE participants 
ADD COLUMN user_id UUID;

-- Создаем индекс для быстрого поиска участников пользователя
CREATE INDEX idx_participants_user_id ON participants(user_id);

-- Создаем составной индекс для поиска участника в конкретной встрече
CREATE INDEX idx_participants_meeting_user ON participants(meeting_id, user_id);