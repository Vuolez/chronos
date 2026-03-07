-- Replace voted_time with time_start, time_end
ALTER TABLE votes DROP COLUMN IF EXISTS voted_time;

ALTER TABLE votes ADD COLUMN IF NOT EXISTS time_start TIME;
ALTER TABLE votes ADD COLUMN IF NOT EXISTS time_end TIME;
