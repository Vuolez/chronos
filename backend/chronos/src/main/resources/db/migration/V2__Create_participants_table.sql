-- Create participants table
CREATE TABLE participants (
    id UUID PRIMARY KEY,
    meeting_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'THINKING' NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Foreign key constraint
    CONSTRAINT fk_participants_meeting_id 
        FOREIGN KEY (meeting_id) 
        REFERENCES meetings(id) 
        ON DELETE CASCADE
);

-- Create index for faster lookups by meeting_id
CREATE INDEX idx_participants_meeting_id ON participants(meeting_id);

-- Create index for faster lookups by status
CREATE INDEX idx_participants_status ON participants(status);

-- Create index for faster lookups by joined_at
CREATE INDEX idx_participants_joined_at ON participants(joined_at);