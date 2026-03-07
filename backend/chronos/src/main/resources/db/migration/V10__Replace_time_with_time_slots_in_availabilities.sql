-- Replace time_from, time_to with time_slots BIT(48)
-- NULL = время не выбрано. Все биты 1 = весь день. Конкретные биты = выбранные слоты (30 мин).
ALTER TABLE availabilities DROP COLUMN IF EXISTS time_from;
ALTER TABLE availabilities DROP COLUMN IF EXISTS time_to;
ALTER TABLE availabilities ADD COLUMN IF NOT EXISTS time_slots bit(48) NULL;