-- Миграция статусов участников: старые VOTED -> CHOOSEN_DATE
-- При первом recalculate после деплоя статусы приведутся к корректным
UPDATE participants SET status = 'CHOOSEN_DATE' WHERE status = 'VOTED';
