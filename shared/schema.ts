import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isTeacher: boolean("is_teacher").notNull().default(false),
  studentId: text("student_id").unique(),
});

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  teacherId: integer("teacher_id").notNull(),
  description: text("description"),
});

export const classStudents = pgTable("class_students", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull(),
  studentId: integer("student_id").notNull(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  teacherId: integer("teacher_id").notNull(),
  classId: integer("class_id").notNull(),
  dueDate: timestamp("due_date").notNull(),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull(),
  studentId: integer("student_id").notNull(),
  content: text("content").notNull(),
  keystrokes: jsonb("keystrokes").notNull().$type<Array<{ timestamp: string; type: string; key?: string }>>(),
  quotes: jsonb("quotes").$type<Array<{ text: string; source: string; page?: string; insertedAt: string }>>(),
  submittedAt: timestamp("submitted_at").notNull(),
  grade: integer("grade"),
  feedback: text("feedback"),
  is_draft: boolean("is_draft").notNull().default(true),
  
  // AI Analysis fields - Overall Scores
  aiWritingQualityScore: integer("ai_writing_quality_score"), // Score * 100 (e.g., 4.1 -> 410)
  aiWritingQualityConfidence: integer("ai_writing_quality_confidence"), // Confidence * 100 (e.g., 0.75 -> 75)
  aiPlagiarismProbability: integer("ai_plagiarism_probability"), // Probability * 100 (e.g., 16.6 -> 1660)
  aiPlagiarismConfidence: integer("ai_plagiarism_confidence"), // Confidence * 100 (e.g., 0.70 -> 70)
  aiAnalysisDate: timestamp("ai_analysis_date"), // When analysis was performed
  aiKeystrokeCount: integer("ai_keystroke_count"), // Number of keystrokes analyzed
  
  // Detailed Quality Score Components (all * 100 for precision)
  aiQualityGrammarScore: integer("ai_quality_grammar_score"), // Grammar and syntax score * 100
  aiQualityCoherenceScore: integer("ai_quality_coherence_score"), // Logical flow and coherence * 100
  aiQualityVocabularyScore: integer("ai_quality_vocabulary_score"), // Vocabulary usage * 100
  aiQualityStructureScore: integer("ai_quality_structure_score"), // Document structure * 100
  aiQualityContentScore: integer("ai_quality_content_score"), // Content quality and relevance * 100
  aiQualityOriginalityScore: integer("ai_quality_originality_score"), // Originality and creativity * 100
  
  // Detailed Plagiarism Analysis
  aiPlagiarismSimilarityPercentage: integer("ai_plagiarism_similarity_percentage"), // Overall similarity * 100
  aiPlagiarismSourceCount: integer("ai_plagiarism_source_count"), // Number of potential sources found
  aiPlagiarismLongestMatch: integer("ai_plagiarism_longest_match"), // Longest matching sequence length
  aiPlagiarismTotalMatches: integer("ai_plagiarism_total_matches"), // Total number of matches found
  aiPlagiarismHighRiskSegments: integer("ai_plagiarism_high_risk_segments"), // Number of high-risk segments
  aiPlagiarismMediumRiskSegments: integer("ai_plagiarism_medium_risk_segments"), // Number of medium-risk segments
  
  // Analysis Metadata
  aiAnalysisModelVersion: text("ai_analysis_model_version"), // Version of the AI model used
  aiAnalysisProcessingTime: integer("ai_analysis_processing_time"), // Processing time in milliseconds
  aiAnalysisWordCount: integer("ai_analysis_word_count"), // Number of words analyzed
  aiAnalysisCharacterCount: integer("ai_analysis_character_count"), // Number of characters analyzed
  
  // Detailed Analysis Results (JSON)
  aiQualityAnalysisDetails: jsonb("ai_quality_analysis_details").$type<{
    grammarIssues: Array<{ type: string; position: number; suggestion: string; severity: string }>;
    coherenceIssues: Array<{ type: string; paragraph: number; description: string; severity: string }>;
    vocabularyInsights: Array<{ type: string; word: string; suggestion: string; context: string }>;
    structureAnalysis: { 
      introduction: { score: number; feedback: string };
      body: { score: number; feedback: string };
      conclusion: { score: number; feedback: string };
    };
    strengths: string[];
    improvements: string[];
  }>(),
  
  aiPlagiarismAnalysisDetails: jsonb("ai_plagiarism_analysis_details").$type<{
    matches: Array<{
      sourceText: string;
      submissionText: string;
      similarityScore: number;
      sourceType: string;
      sourceUrl?: string;
      startPosition: number;
      endPosition: number;
      riskLevel: 'high' | 'medium' | 'low';
    }>;
    sources: Array<{
      name: string;
      url?: string;
      type: string;
      overallSimilarity: number;
      matchCount: number;
    }>;
    summary: {
      totalWords: number;
      flaggedWords: number;
      flaggedPercentage: number;
      recommendedAction: string;
    };
  }>(),
});

export const submissionVersions = pgTable("submission_versions", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  content: text("content").notNull(),
  keystrokes: jsonb("keystrokes").notNull().$type<Array<{ timestamp: string; type: string; key?: string }>>(),
  quotes: jsonb("quotes").$type<Array<{ text: string; source: string; page?: string; insertedAt: string }>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  versionNumber: integer("version_number").notNull(),
  versionName: text("version_name"),
});

export const writingSessions = pgTable("writing_sessions", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull(),
  studentId: integer("student_id").notNull(),
  sessionNumber: integer("session_number").notNull(), // 1, 2, 3, etc.
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"), // null if session is still active
  sessionDuration: integer("session_duration"), // duration in minutes when session ends
  contentAtStart: text("content_at_start").notNull(),
  contentAtEnd: text("content_at_end"),
  keystrokesInSession: jsonb("keystrokes_in_session").notNull().$type<Array<{ timestamp: string; type: string; key?: string }>>(),
  questionsTriggered: boolean("questions_triggered").notNull().default(false),
  questionsCompleted: boolean("questions_completed").notNull().default(false),
});

export const sessionQuestions = pgTable("session_questions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  questionNumber: integer("question_number").notNull(), // 1, 2, or 3
  question: text("question").notNull(),
  generatedAt: timestamp("generated_at").notNull(),
  askedAt: timestamp("asked_at"), // when question was shown to user
  answeredAt: timestamp("answered_at"), // when user submitted answer
  answer: text("answer"),
  timeToAnswer: integer("time_to_answer"), // seconds taken to answer
  timedOut: boolean("timed_out").notNull().default(false), // true if 15s timer expired
  contextContent: text("context_content").notNull(), // content at time of question generation
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isTeacher: true,
  studentId: true,
});

export const insertStudentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  username: z.string().email("Must be a valid email"),
});

export const resetPasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const insertClassSchema = createInsertSchema(classes).pick({
  name: true,
  description: true,
});

export const addStudentToClassSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
});

export const insertAssignmentSchema = createInsertSchema(assignments).pick({
  title: true,
  description: true,
  classId: true,
}).extend({
  dueDate: z.string().transform((str) => new Date(str)),
});

export const insertSubmissionSchema = createInsertSchema(submissions).pick({
  assignmentId: true,
  content: true,
  keystrokes: true,
}).extend({
  is_draft: z.boolean().default(true),
  quotes: z.array(
    z.object({
      text: z.string(),
      source: z.string(),
      page: z.string().optional(),
      insertedAt: z.string()
    })
  ).optional().default([]),
});

export const gradeSchema = z.object({
  grade: z.number().int().min(0).max(100),
  feedback: z.string().min(1),
}).strict();

export const insertVersionSchema = z.object({
  submissionId: z.number().int().positive(),
  content: z.string(),
  keystrokes: z.array(
    z.object({
      timestamp: z.string(),
      type: z.string(),
      key: z.string().optional()
    })
  ),
  quotes: z.array(
    z.object({
      text: z.string(),
      source: z.string(),
      page: z.string().optional(),
      insertedAt: z.string()
    })
  ).optional().default([]),
  versionName: z.string().optional()
});

export const insertWritingSessionSchema = createInsertSchema(writingSessions).pick({
  submissionId: true,
  studentId: true,
  sessionNumber: true,
  contentAtStart: true,
  keystrokesInSession: true,
});

export const insertSessionQuestionSchema = createInsertSchema(sessionQuestions).pick({
  sessionId: true,
  questionNumber: true,
  question: true,
  contextContent: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type AddStudentToClass = z.infer<typeof addStudentToClassSchema>;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type GradeSubmission = z.infer<typeof gradeSchema>;
export type InsertVersion = z.infer<typeof insertVersionSchema>;
export type InsertWritingSession = z.infer<typeof insertWritingSessionSchema>;
export type InsertSessionQuestion = z.infer<typeof insertSessionQuestionSchema>;

export type User = typeof users.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type ClassStudent = typeof classStudents.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type SubmissionVersion = typeof submissionVersions.$inferSelect;
export type WritingSession = typeof writingSessions.$inferSelect;
export type SessionQuestion = typeof sessionQuestions.$inferSelect;