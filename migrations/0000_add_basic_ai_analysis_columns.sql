-- Migration: Add AI Analysis columns to submissions table
-- Run this script to add caching for AI analysis results

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_writing_quality_score INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_writing_quality_confidence INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_plagiarism_probability INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_plagiarism_confidence INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_analysis_date TIMESTAMP;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_keystroke_count INTEGER;

-- Add comments for clarity
COMMENT ON COLUMN submissions.ai_writing_quality_score IS 'Writing quality score * 100 (e.g., 4.1 -> 410)';
COMMENT ON COLUMN submissions.ai_writing_quality_confidence IS 'Confidence level * 100 (e.g., 0.75 -> 75)';
COMMENT ON COLUMN submissions.ai_plagiarism_probability IS 'Plagiarism probability * 100 (e.g., 16.6 -> 1660)';
COMMENT ON COLUMN submissions.ai_plagiarism_confidence IS 'Plagiarism confidence * 100 (e.g., 0.70 -> 70)';
COMMENT ON COLUMN submissions.ai_analysis_date IS 'Timestamp when AI analysis was performed';
COMMENT ON COLUMN submissions.ai_keystroke_count IS 'Number of keystrokes analyzed';

-- Create index for faster lookups of analyzed submissions
CREATE INDEX IF NOT EXISTS idx_submissions_ai_analysis_date ON submissions(ai_analysis_date) WHERE ai_analysis_date IS NOT NULL; 