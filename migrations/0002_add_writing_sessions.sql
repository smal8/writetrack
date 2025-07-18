CREATE TABLE IF NOT EXISTS "writing_sessions" (
  "id" SERIAL PRIMARY KEY,
  "submission_id" INTEGER NOT NULL,
  "student_id" INTEGER NOT NULL,
  "session_number" INTEGER NOT NULL,
  "start_time" TIMESTAMP NOT NULL,
  "end_time" TIMESTAMP,
  "session_duration" INTEGER,
  "content_at_start" TEXT NOT NULL,
  "content_at_end" TEXT,
  "keystrokes_in_session" JSONB NOT NULL,
  "questions_triggered" BOOLEAN NOT NULL DEFAULT false,
  "questions_completed" BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "session_questions" (
  "id" SERIAL PRIMARY KEY,
  "session_id" INTEGER NOT NULL,
  "question_number" INTEGER NOT NULL,
  "question" TEXT NOT NULL,
  "generated_at" TIMESTAMP NOT NULL,
  "asked_at" TIMESTAMP,
  "answered_at" TIMESTAMP,
  "answer" TEXT,
  "time_to_answer" INTEGER,
  "timed_out" BOOLEAN NOT NULL DEFAULT false,
  "context_content" TEXT NOT NULL
); 