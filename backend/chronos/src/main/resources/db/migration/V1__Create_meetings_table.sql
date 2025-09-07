-- Create meetings table
CREATE TABLE meetings (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'PLANNING' NOT NULL,
    final_date DATE,
    final_time TIME,
    share_token VARCHAR(255) UNIQUE NOT NULL
);

-- Create unique constraint for share_token
CREATE UNIQUE INDEX uk_meetings_share_token ON meetings(share_token);

-- Create index for faster lookups by status
CREATE INDEX idx_meetings_status ON meetings(status);

-- Create index for faster lookups by created_at
CREATE INDEX idx_meetings_created_at ON meetings(created_at);