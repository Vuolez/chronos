-- Добавление email поля в таблицу participants
-- 
-- Добавляем поле email для участников встреч

ALTER TABLE participants
ADD COLUMN email VARCHAR(255);

-- Добавляем индекс для поиска участников по email
CREATE INDEX idx_participants_email ON participants(email);

-- Комментарий к новому полю
COMMENT ON COLUMN participants.email IS 'Email участника (опционально)';