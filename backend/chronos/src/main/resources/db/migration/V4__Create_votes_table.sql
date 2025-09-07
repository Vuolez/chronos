-- Create votes table for future iterations
CREATE TABLE votes (
    id UUID PRIMARY KEY,
    participant_id UUID NOT NULL,
    meeting_id UUID NOT NULL,
    voted_date DATE NOT NULL,
    voted_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Foreign key constraints
    CONSTRAINT fk_votes_participant_id 
        FOREIGN KEY (participant_id) 
        REFERENCES participants(id) 
        ON DELETE CASCADE,
        
    CONSTRAINT fk_votes_meeting_id 
        FOREIGN KEY (meeting_id) 
        REFERENCES meetings(id) 
        ON DELETE CASCADE,
        
    -- Unique constraint: one participant can vote only once per meeting
    CONSTRAINT uk_votes_participant_meeting 
        UNIQUE (participant_id, meeting_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_votes_meeting_id ON votes(meeting_id);
CREATE INDEX idx_votes_participant_id ON votes(participant_id);
CREATE INDEX idx_votes_voted_date ON votes(voted_date);

-- Composite index for finding votes by meeting and date
CREATE INDEX idx_votes_meeting_date ON votes(meeting_id, voted_date);