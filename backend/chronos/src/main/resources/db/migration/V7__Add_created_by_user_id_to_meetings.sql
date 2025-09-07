-- Добавление связи встреч с создателями (пользователями)
-- 
-- Добавляем поле created_by_user_id в таблицу meetings
-- для связи встречи с пользователем, который её создал

ALTER TABLE meetings
ADD COLUMN created_by_user_id UUID REFERENCES users(id);

-- Добавляем индекс для быстрого поиска встреч по создателю
CREATE INDEX idx_meetings_created_by_user_id ON meetings(created_by_user_id);

-- Комментарии к новому полю
COMMENT ON COLUMN meetings.created_by_user_id IS 'ID пользователя, создавшего встречу';