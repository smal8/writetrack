-- Migration: Add comprehensive AI Analysis columns to submissions table
-- This adds all the detailed analysis columns defined in the schema

-- Quality Score Components (all * 100 for precision)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_quality_grammar_score INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_quality_coherence_score INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_quality_vocabulary_score INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_quality_structure_score INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_quality_content_score INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_quality_originality_score INTEGER;

-- Detailed Plagiarism Analysis
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_plagiarism_similarity_percentage INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_plagiarism_source_count INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_plagiarism_longest_match INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_plagiarism_total_matches INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_plagiarism_high_risk_segments INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_plagiarism_medium_risk_segments INTEGER;

-- Analysis Metadata
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_analysis_model_version TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_analysis_processing_time INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_analysis_word_count INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_analysis_character_count INTEGER;

-- Detailed Analysis Results (JSON)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_quality_analysis_details JSONB;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS ai_plagiarism_analysis_details JSONB;

-- Add comments for clarity
COMMENT ON COLUMN submissions.ai_quality_grammar_score IS 'Grammar and syntax score * 100';
COMMENT ON COLUMN submissions.ai_quality_coherence_score IS 'Logical flow and coherence score * 100';
COMMENT ON COLUMN submissions.ai_quality_vocabulary_score IS 'Vocabulary usage score * 100';
COMMENT ON COLUMN submissions.ai_quality_structure_score IS 'Document structure score * 100';
COMMENT ON COLUMN submissions.ai_quality_content_score IS 'Content quality and relevance score * 100';
COMMENT ON COLUMN submissions.ai_quality_originality_score IS 'Originality and creativity score * 100';

COMMENT ON COLUMN submissions.ai_plagiarism_similarity_percentage IS 'Overall similarity percentage * 100';
COMMENT ON COLUMN submissions.ai_plagiarism_source_count IS 'Number of potential sources found';
COMMENT ON COLUMN submissions.ai_plagiarism_longest_match IS 'Longest matching sequence length';
COMMENT ON COLUMN submissions.ai_plagiarism_total_matches IS 'Total number of matches found';
COMMENT ON COLUMN submissions.ai_plagiarism_high_risk_segments IS 'Number of high-risk segments';
COMMENT ON COLUMN submissions.ai_plagiarism_medium_risk_segments IS 'Number of medium-risk segments';

COMMENT ON COLUMN submissions.ai_analysis_model_version IS 'Version of the AI model used';
COMMENT ON COLUMN submissions.ai_analysis_processing_time IS 'Processing time in milliseconds';
COMMENT ON COLUMN submissions.ai_analysis_word_count IS 'Number of words analyzed';
COMMENT ON COLUMN submissions.ai_analysis_character_count IS 'Number of characters analyzed';

COMMENT ON COLUMN submissions.ai_quality_analysis_details IS 'Detailed quality analysis with grammar issues, coherence analysis, vocabulary insights, etc.';
COMMENT ON COLUMN submissions.ai_plagiarism_analysis_details IS 'Detailed plagiarism analysis with matches, sources, and risk assessment';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_submissions_ai_quality_score ON submissions(ai_writing_quality_score) WHERE ai_writing_quality_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_ai_plagiarism_probability ON submissions(ai_plagiarism_probability) WHERE ai_plagiarism_probability IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_ai_model_version ON submissions(ai_analysis_model_version) WHERE ai_analysis_model_version IS NOT NULL;

-- Create composite index for filtering by quality and plagiarism together
CREATE INDEX IF NOT EXISTS idx_submissions_ai_scores ON submissions(ai_writing_quality_score, ai_plagiarism_probability) 
WHERE ai_writing_quality_score IS NOT NULL AND ai_plagiarism_probability IS NOT NULL; 