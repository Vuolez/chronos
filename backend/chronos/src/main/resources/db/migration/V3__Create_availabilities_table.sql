-- Create availabilities table
CREATE TABLE availabilities (
    id UUID PRIMARY KEY,
    participant_id UUID NOT NULL,
    meeting_id UUID NOT NULL,
    date DATE NOT NULL,
    time_from TIME,
    time_to TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Foreign key constraints
    CONSTRAINT fk_availabilities_participant_id 
        FOREIGN KEY (participant_id) 
        REFERENCES participants(id) 
        ON DELETE CASCADE,
        
    CONSTRAINT fk_availabilities_meeting_id 
        FOREIGN KEY (meeting_id) 
        REFERENCES meetings(id) 
        ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX idx_availabilities_participant_id ON availabilities(participant_id);
CREATE INDEX idx_availabilities_meeting_id ON availabilities(meeting_id);
CREATE INDEX idx_availabilities_date ON availabilities(date);

-- Composite index for finding availabilities by meeting and date
CREATE INDEX idx_availabilities_meeting_date ON availabilities(meeting_id, date);

-- Composite index for finding participant availabilities by meeting
CREATE INDEX idx_availabilities_meeting_participant ON availabilities(meeting_id, participant_id);