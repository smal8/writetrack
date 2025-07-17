import { assignments, submissions, users, classes, classStudents, submissionVersions, writingSessions, sessionQuestions } from "@shared/schema";
import type { Assignment, InsertAssignment, InsertStudent, InsertSubmission, InsertUser, Submission, User, GradeSubmission, Class, InsertClass, ClassStudent, InsertVersion, SubmissionVersion, WritingSession, SessionQuestion, InsertWritingSession, InsertSessionQuestion } from "@shared/schema";
import { db } from "./db";
import { eq, and, count, desc, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByStudentId(studentId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  createStudentAccount(student: InsertStudent, password: string): Promise<User>;
  updateUserPassword(userId: number, password: string): Promise<User>;

  createClass(teacherId: number, classData: InsertClass): Promise<Class>;
  getClass(id: number): Promise<Class | undefined>;
  getTeacherClasses(teacherId: number): Promise<Class[]>;
  getClassStudents(classId: number): Promise<User[]>;
  addStudentToClass(classId: number, studentId: number): Promise<ClassStudent>;
  isStudentInClass(classId: number, studentId: number): Promise<boolean>;
  getStudentClasses(studentId: number): Promise<Class[]>;

  createAssignment(assignment: InsertAssignment & { teacherId: number }): Promise<Assignment>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  getAssignments(studentId: number): Promise<Assignment[]>;
  getTeacherAssignments(teacherId: number): Promise<Assignment[]>;
  getClassAssignments(classId: number): Promise<Assignment[]>;

  createSubmission(submission: InsertSubmission & { studentId: number }): Promise<Submission>;
  getSubmission(id: number): Promise<Submission | undefined>;
  getAssignmentSubmissions(assignmentId: number): Promise<Submission[]>;
  getStudentSubmissions(studentId: number): Promise<Submission[]>;
  gradeSubmission(id: number, grade: GradeSubmission): Promise<Submission>;
  updateSubmission(id: number, content: string, keystrokes: unknown[], quotes?: unknown[]): Promise<Submission>;
  finalizeSubmission(id: number): Promise<Submission>;
  getDraftSubmission(assignmentId: number, studentId: number): Promise<Submission | undefined>;
  updateSubmissionAnalysis(id: number, analysis: {
    aiWritingQualityScore: number;
    aiWritingQualityConfidence: number;
    aiPlagiarismProbability: number;
    aiPlagiarismConfidence: number;
    aiAnalysisDate: Date;
    aiKeystrokeCount: number;
    
    // Detailed Quality Score Components
    aiQualityGrammarScore?: number;
    aiQualityCoherenceScore?: number;
    aiQualityVocabularyScore?: number;
    aiQualityStructureScore?: number;
    aiQualityContentScore?: number;
    aiQualityOriginalityScore?: number;
    
    // Detailed Plagiarism Analysis
    aiPlagiarismSimilarityPercentage?: number;
    aiPlagiarismSourceCount?: number;
    aiPlagiarismLongestMatch?: number;
    aiPlagiarismTotalMatches?: number;
    aiPlagiarismHighRiskSegments?: number;
    aiPlagiarismMediumRiskSegments?: number;
    
    // Analysis Metadata
    aiAnalysisModelVersion?: string;
    aiAnalysisProcessingTime?: number;
    aiAnalysisWordCount?: number;
    aiAnalysisCharacterCount?: number;
    
    // Detailed Analysis Results
    aiQualityAnalysisDetails?: any;
    aiPlagiarismAnalysisDetails?: any;
  }): Promise<Submission>;

  // Submission version management
  createSubmissionVersion(version: InsertVersion): Promise<SubmissionVersion>;
  getSubmissionVersions(submissionId: number): Promise<SubmissionVersion[]>;
  getSubmissionVersion(versionId: number): Promise<SubmissionVersion | undefined>;
  restoreSubmissionVersion(submissionId: number, versionId: number): Promise<Submission>;

  // Writing session management
  createWritingSession(session: InsertWritingSession): Promise<WritingSession>;
  createSessionForQuestionTrigger(submissionId: number, contentAtTrigger: string): Promise<WritingSession>;
  getActiveSession(submissionId: number, studentId: number): Promise<WritingSession | undefined>;
  getSessionsBySubmission(submissionId: number): Promise<WritingSession[]>;
  endWritingSession(sessionId: number, endContent: string): Promise<WritingSession>;
  updateSessionQuestions(sessionId: number, triggered: boolean, completed: boolean): Promise<WritingSession>;
  updateSessionKeystrokes(sessionId: number, keystrokes: any[]): Promise<WritingSession>;

  // Session question management
  createSessionQuestions(questions: InsertSessionQuestion[]): Promise<SessionQuestion[]>;
  getSessionQuestions(sessionId: number): Promise<SessionQuestion[]>;
  updateQuestionAnswer(questionId: number, answer: string, timeToAnswer: number, timedOut: boolean): Promise<SessionQuestion>;

  sessionStore: any;
  clearStorage(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByStudentId(studentId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.studentId, studentId));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createStudentAccount(student: InsertStudent, password: string): Promise<User> {
    const [user] = await db.insert(users).values({
      username: student.username,
      password,
      isTeacher: false,
      studentId: student.studentId
    }).returning();
    return user;
  }

  async updateUserPassword(userId: number, password: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createClass(teacherId: number, classData: InsertClass): Promise<Class> {
    const [class_] = await db
      .insert(classes)
      .values({ ...classData, teacherId })
      .returning();
    return class_;
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [class_] = await db.select().from(classes).where(eq(classes.id, id));
    return class_;
  }

  async getTeacherClasses(teacherId: number): Promise<Class[]> {
    return db.select().from(classes).where(eq(classes.teacherId, teacherId));
  }

  async getClassStudents(classId: number): Promise<User[]> {
    const studentRecords = await db
      .select({
        user: users
      })
      .from(classStudents)
      .where(eq(classStudents.classId, classId))
      .innerJoin(users, eq(users.id, classStudents.studentId));

    return studentRecords.map(record => record.user);
  }

  async addStudentToClass(classId: number, studentId: number): Promise<ClassStudent> {
    const [record] = await db
      .insert(classStudents)
      .values({ classId, studentId })
      .returning();
    return record;
  }

  async removeStudentFromClass(classId: number, studentId: number): Promise<boolean> {
    const result = await db
      .delete(classStudents)
      .where(
        and(
          eq(classStudents.classId, classId),
          eq(classStudents.studentId, studentId)
        )
      );
    return !!result;
  }

  async isStudentInClass(classId: number, studentId: number): Promise<boolean> {
    const [record] = await db
      .select()
      .from(classStudents)
      .where(
        and(
          eq(classStudents.classId, classId),
          eq(classStudents.studentId, studentId)
        )
      );
    return !!record;
  }

  async getStudentClasses(studentId: number): Promise<Class[]> {
    const records = await db
      .select({
        class: classes
      })
      .from(classStudents)
      .where(eq(classStudents.studentId, studentId))
      .innerJoin(classes, eq(classes.id, classStudents.classId));

    return records.map(record => record.class);
  }

  async createAssignment(assignment: InsertAssignment & { teacherId: number }): Promise<Assignment> {
    const [record] = await db.insert(assignments).values(assignment).returning();
    return record;
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    const [assignment] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id));
    return assignment;
  }

  async getAssignments(studentId: number): Promise<Assignment[]> {
    // Get assignments only from classes where the student is enrolled
    const records = await db
      .select({
        assignment: assignments
      })
      .from(classStudents)
      .where(eq(classStudents.studentId, studentId))
      .innerJoin(classes, eq(classes.id, classStudents.classId))
      .innerJoin(assignments, eq(assignments.classId, classes.id));

    return records.map(record => record.assignment);
  }

  async getTeacherAssignments(teacherId: number): Promise<Assignment[]> {
    return db
      .select()
      .from(assignments)
      .where(eq(assignments.teacherId, teacherId));
  }

  async getClassAssignments(classId: number): Promise<Assignment[]> {
    return db
      .select()
      .from(assignments)
      .where(eq(assignments.classId, classId));
  }

  async createSubmission(submission: InsertSubmission & { studentId: number }): Promise<Submission> {
    const [record] = await db
      .insert(submissions)
      .values({
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        content: submission.content,
        keystrokes: submission.keystrokes,
        quotes: submission.quotes || null,
        submittedAt: submission.submittedAt || new Date(), // Added submittedAt with default value
        grade: null,
        feedback: null,
        is_draft: true
      })
      .returning();
    return record;
  }

  async getSubmission(id: number): Promise<Submission | undefined> {
    const [submission] = await db
      .select({
        submission: submissions,
        assignment: assignments
      })
      .from(submissions)
      .where(eq(submissions.id, id))
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId));

    if (!submission) return undefined;

    return {
      ...submission.submission,
      assignment: submission.assignment
    };
  }

  async getAssignmentSubmissions(assignmentId: number): Promise<Submission[]> {
    return db
      .select()
      .from(submissions)
      .where(eq(submissions.assignmentId, assignmentId));
  }

  async getStudentSubmissions(studentId: number): Promise<Submission[]> {
    // Get all submissions for this student
    const submissions = await db
      .select({
        submission: submissions,
        assignment: assignments
      })
      .from(submissions)
      .where(eq(submissions.studentId, studentId))
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId));

    return submissions.map(record => ({
      ...record.submission,
      assignment: record.assignment
    }));
  }

  async gradeSubmission(id: number, grade: GradeSubmission): Promise<Submission> {
    const [submission] = await db
      .update(submissions)
      .set(grade)
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  async updateSubmission(id: number, content: string, keystrokes: unknown[], quotes?: unknown[]): Promise<Submission> {
    const [submission] = await db
      .update(submissions)
      .set({
        content,
        keystrokes,
        quotes: quotes || null,
        is_draft: true,
        submittedAt: new Date() // Update timestamp on every update
      })
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  async finalizeSubmission(id: number): Promise<Submission> {
    const [submission] = await db
      .update(submissions)
      .set({
        is_draft: false,
        submittedAt: new Date()
      })
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  async getDraftSubmission(assignmentId: number, studentId: number): Promise<Submission | undefined> {
    const result = await db.select()
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, assignmentId),
          eq(submissions.studentId, studentId),
          eq(submissions.is_draft, true)
        )
      )
      .limit(1);

    return result[0];
  }

  async updateSubmissionAnalysis(id: number, analysis: {
    aiWritingQualityScore: number;
    aiWritingQualityConfidence: number;
    aiPlagiarismProbability: number;
    aiPlagiarismConfidence: number;
    aiAnalysisDate: Date;
    aiKeystrokeCount: number;
    
    // Detailed Quality Score Components
    aiQualityGrammarScore?: number;
    aiQualityCoherenceScore?: number;
    aiQualityVocabularyScore?: number;
    aiQualityStructureScore?: number;
    aiQualityContentScore?: number;
    aiQualityOriginalityScore?: number;
    
    // Detailed Plagiarism Analysis
    aiPlagiarismSimilarityPercentage?: number;
    aiPlagiarismSourceCount?: number;
    aiPlagiarismLongestMatch?: number;
    aiPlagiarismTotalMatches?: number;
    aiPlagiarismHighRiskSegments?: number;
    aiPlagiarismMediumRiskSegments?: number;
    
    // Analysis Metadata
    aiAnalysisModelVersion?: string;
    aiAnalysisProcessingTime?: number;
    aiAnalysisWordCount?: number;
    aiAnalysisCharacterCount?: number;
    
    // Detailed Analysis Results
    aiQualityAnalysisDetails?: any;
    aiPlagiarismAnalysisDetails?: any;
  }): Promise<Submission> {
    const result = await db
      .update(submissions)
      .set({
        aiWritingQualityScore: analysis.aiWritingQualityScore,
        aiWritingQualityConfidence: analysis.aiWritingQualityConfidence,
        aiPlagiarismProbability: analysis.aiPlagiarismProbability,
        aiPlagiarismConfidence: analysis.aiPlagiarismConfidence,
        aiAnalysisDate: analysis.aiAnalysisDate,
        aiKeystrokeCount: analysis.aiKeystrokeCount,
        
        // Detailed Quality Score Components
        aiQualityGrammarScore: analysis.aiQualityGrammarScore,
        aiQualityCoherenceScore: analysis.aiQualityCoherenceScore,
        aiQualityVocabularyScore: analysis.aiQualityVocabularyScore,
        aiQualityStructureScore: analysis.aiQualityStructureScore,
        aiQualityContentScore: analysis.aiQualityContentScore,
        aiQualityOriginalityScore: analysis.aiQualityOriginalityScore,
        
        // Detailed Plagiarism Analysis
        aiPlagiarismSimilarityPercentage: analysis.aiPlagiarismSimilarityPercentage,
        aiPlagiarismSourceCount: analysis.aiPlagiarismSourceCount,
        aiPlagiarismLongestMatch: analysis.aiPlagiarismLongestMatch,
        aiPlagiarismTotalMatches: analysis.aiPlagiarismTotalMatches,
        aiPlagiarismHighRiskSegments: analysis.aiPlagiarismHighRiskSegments,
        aiPlagiarismMediumRiskSegments: analysis.aiPlagiarismMediumRiskSegments,
        
        // Analysis Metadata
        aiAnalysisModelVersion: analysis.aiAnalysisModelVersion,
        aiAnalysisProcessingTime: analysis.aiAnalysisProcessingTime,
        aiAnalysisWordCount: analysis.aiAnalysisWordCount,
        aiAnalysisCharacterCount: analysis.aiAnalysisCharacterCount,
        
        // Detailed Analysis Results
        aiQualityAnalysisDetails: analysis.aiQualityAnalysisDetails,
        aiPlagiarismAnalysisDetails: analysis.aiPlagiarismAnalysisDetails,
      })
      .where(eq(submissions.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error("Submission not found");
    }

    return result[0];
  }

  async createSubmissionVersion(version: InsertVersion): Promise<SubmissionVersion> {
    // Calculate the next version number
    const existingVersions = await db
      .select({ count: count() })
      .from(submissionVersions)
      .where(eq(submissionVersions.submissionId, version.submissionId));

    const versionNumber = (existingVersions[0]?.count || 0) + 1;

    const [record] = await db
      .insert(submissionVersions)
      .values({
        ...version,
        versionNumber,
        versionName: version.versionName || `Version ${versionNumber}`,
        createdAt: new Date()
      })
      .returning();

    return record;
  }

  async getSubmissionVersions(submissionId: number): Promise<SubmissionVersion[]> {
    return db
      .select()
      .from(submissionVersions)
      .where(eq(submissionVersions.submissionId, submissionId))
      .orderBy(desc(submissionVersions.createdAt));
  }

  async getSubmissionVersion(versionId: number): Promise<SubmissionVersion | undefined> {
    const [version] = await db
      .select()
      .from(submissionVersions)
      .where(eq(submissionVersions.id, versionId));

    return version;
  }

  async restoreSubmissionVersion(submissionId: number, versionId: number): Promise<Submission> {
    // Get the version
    const version = await this.getSubmissionVersion(versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    // Update the submission with the version content
    const [submission] = await db
      .update(submissions)
      .set({
        content: version.content,
        keystrokes: version.keystrokes,
        quotes: version.quotes,
        submittedAt: new Date() //Update timestamp on restore
      })
      .where(eq(submissions.id, submissionId))
      .returning();

    return submission;
  }

  // Writing session management
  async createWritingSession(session: InsertWritingSession): Promise<WritingSession> {
    const [newSession] = await db.insert(writingSessions).values({
      ...session,
      startTime: new Date(),
    }).returning();
    return newSession;
  }

  async getActiveSession(submissionId: number, studentId: number): Promise<WritingSession | undefined> {
    const [session] = await db.select().from(writingSessions)
      .where(and(
        eq(writingSessions.submissionId, submissionId),
        eq(writingSessions.studentId, studentId),
        eq(writingSessions.endTime, null as any) // Session is still active
      ))
      .orderBy(desc(writingSessions.startTime))
      .limit(1);
    return session;
  }

  // Get previous questions for a submission to avoid repetition
  async getPreviousQuestionsForSubmission(submissionId: number) {
    // Use a join to get questions directly instead of multiple queries
    const questions = await db
      .select({
        id: sessionQuestions.id,
        question: sessionQuestions.question,
        sessionId: sessionQuestions.sessionId,
        questionNumber: sessionQuestions.questionNumber,
        generatedAt: sessionQuestions.generatedAt
      })
      .from(sessionQuestions)
      .innerJoin(writingSessions, eq(sessionQuestions.sessionId, writingSessions.id))
      .where(eq(writingSessions.submissionId, submissionId))
      .orderBy(desc(sessionQuestions.generatedAt));

    console.log(`📚 Retrieved ${questions.length} previous questions for submission ${submissionId}`);
    return questions;
  }

  // Simplified session management with better Drizzle patterns
  async ensureSubmissionSession(submissionId: number, contentAtStart: string) {
    // Use a single query with limit and order
    const [existingSession] = await db
      .select()
      .from(writingSessions)
      .where(eq(writingSessions.submissionId, submissionId))
      .orderBy(desc(writingSessions.startTime))
      .limit(1);

    if (existingSession) {
      return existingSession;
    }

    // Get student ID from submission using a join
    const [submissionData] = await db
      .select({ studentId: submissions.studentId })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);

    if (!submissionData) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    // Create a new session if none exists
    const [session] = await db
      .insert(writingSessions)
      .values({
        submissionId,
        studentId: submissionData.studentId,
        sessionNumber: 1,
        startTime: new Date(),
        contentAtStart,
        questionsTriggered: false,
        questionsCompleted: false,
        keystrokesInSession: []
      })
      .returning();

    return session;
  }

  async saveSessionQuestions(
    sessionId: number,
    questions: any[],
    answers: any[],
    contextContent: string,
    cumulativeTimeWhenShown: number
  ) {
    console.log(`💾 REWRITTEN: Saving session questions for session ${sessionId}`);
    console.log('Questions:', questions.map(q => q.question?.substring(0, 50) + '...'));
    console.log('Answers:', answers.map(a => ({ 
      questionId: a.questionId, 
      answer: a.answer?.substring(0, 30) + '...', 
      timeToAnswer: a.timeToAnswer,
      timedOut: a.timedOut 
    })));

    if (!questions || questions.length === 0) {
      console.log('⚠️ No questions to save');
      return { success: true, message: 'No questions to save' };
    }

    try {
      // Step 1: Insert questions first
      const savedQuestions = [];
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        console.log(`📝 Inserting question ${i + 1}: ${question.question?.substring(0, 50)}...`);
        
        const [savedQuestion] = await db
          .insert(sessionQuestions)
          .values({
            sessionId,
            questionNumber: i + 1,
            question: question.question,
            contextContent,
            generatedAt: new Date(),
            askedAt: new Date()
          })
          .returning();
        
        savedQuestions.push(savedQuestion);
        console.log(`✅ Question ${i + 1} saved with DB ID: ${savedQuestion.id}`);
      }

      // Step 2: Update each question with its answer
      let answersUpdated = 0;
      for (let i = 0; i < answers.length && i < savedQuestions.length; i++) {
        const answer = answers[i];
        const savedQuestion = savedQuestions[i];
        
        // Convert timeToAnswer to integer (round to nearest second)
        const timeToAnswerInt = Math.round(answer.timeToAnswer || 0);
        
        console.log(`💬 Updating question ${savedQuestion.id} with answer: "${answer.answer?.substring(0, 30)}..." (${timeToAnswerInt}s)`);
        
        await db
          .update(sessionQuestions)
          .set({
            answer: answer.answer || '',
            timeToAnswer: timeToAnswerInt,
            timedOut: answer.timedOut || false,
            answeredAt: new Date()
          })
          .where(eq(sessionQuestions.id, savedQuestion.id));
        
        answersUpdated++;
        console.log(`✅ Answer ${i + 1} updated successfully`);
      }

      console.log(`🎉 SUCCESS: Saved ${savedQuestions.length} questions and ${answersUpdated} answers`);
      return { success: true, questions: savedQuestions };

    } catch (error) {
      console.error('❌ REWRITTEN ERROR in saveSessionQuestions:', error);
      throw error;
    }
  }

  // Optimized method to get sessions with questions using joins
  async getSessionsBySubmission(submissionId: number): Promise<WritingSession[]> {
    return await db
      .select()
      .from(writingSessions)
      .where(eq(writingSessions.submissionId, submissionId))
      .orderBy(desc(writingSessions.startTime));
  }

  // Get session questions with better type safety
  async getSessionQuestions(sessionId: number): Promise<SessionQuestion[]> {
    return await db
      .select()
      .from(sessionQuestions)
      .where(eq(sessionQuestions.sessionId, sessionId))
      .orderBy(sessionQuestions.questionNumber);
  }

  // Required interface methods - adding back the missing ones
  async createSessionForQuestionTrigger(submissionId: number, contentAtTrigger: string): Promise<WritingSession> {
    // Get student ID from submission using optimized query
    const [submissionData] = await db
      .select({ studentId: submissions.studentId })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);

    if (!submissionData) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    // Count existing sessions to determine the session number using count()
    const [{ count: sessionCount }] = await db
      .select({ count: count() })
      .from(writingSessions)
      .where(eq(writingSessions.submissionId, submissionId));

    const sessionNumber = sessionCount + 1;

    // Create a new session for this question trigger
    const [session] = await db
      .insert(writingSessions)
      .values({
        submissionId,
        studentId: submissionData.studentId,
        sessionNumber,
        startTime: new Date(),
        contentAtStart: contentAtTrigger,
        questionsTriggered: true,
        questionsCompleted: false,
        keystrokesInSession: []
      })
      .returning();

    console.log(`📝 Created new writing session ${sessionNumber} for submission ${submissionId}`);
    return session;
  }

  async endWritingSession(sessionId: number, endContent: string): Promise<WritingSession> {
    const endTime = new Date();
    
    // Get session start time in one query for duration calculation
    const [session] = await db
      .select({ startTime: writingSessions.startTime })
      .from(writingSessions)
      .where(eq(writingSessions.id, sessionId))
      .limit(1);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const sessionDuration = Math.round((endTime.getTime() - new Date(session.startTime).getTime()) / (1000 * 60)); // minutes

    const [updatedSession] = await db
      .update(writingSessions)
      .set({
        endTime,
        sessionDuration,
        contentAtEnd: endContent
      })
      .where(eq(writingSessions.id, sessionId))
      .returning();

    return updatedSession;
  }

  async updateSessionQuestions(sessionId: number, triggered: boolean, completed: boolean): Promise<WritingSession> {
    const [updatedSession] = await db
      .update(writingSessions)
      .set({
        questionsTriggered: triggered,
        questionsCompleted: completed
      })
      .where(eq(writingSessions.id, sessionId))
      .returning();

    return updatedSession;
  }

  async updateSessionKeystrokes(sessionId: number, keystrokes: any[]): Promise<WritingSession> {
    const [updatedSession] = await db
      .update(writingSessions)
      .set({
        keystrokesInSession: keystrokes
      })
      .where(eq(writingSessions.id, sessionId))
      .returning();

    return updatedSession;
  }

  async createSessionQuestions(questions: InsertSessionQuestion[]): Promise<SessionQuestion[]> {
    if (!questions || questions.length === 0) {
      console.log('⚠️ No questions to create, returning empty array');
      return [];
    }

    // Use batch insert for better performance
    return await db
      .insert(sessionQuestions)
      .values(questions)
      .returning();
  }

  async updateQuestionAnswer(questionId: number, answer: string, timeToAnswer: number, timedOut: boolean): Promise<SessionQuestion> {
    const [updatedQuestion] = await db
      .update(sessionQuestions)
      .set({
        answer,
        timeToAnswer,
        timedOut,
        answeredAt: new Date()
      })
      .where(eq(sessionQuestions.id, questionId))
      .returning();

    return updatedQuestion;
  }

  // Optimized method using joins to get all session data with questions in one query
  async getSubmissionSessionsWithQuestions(submissionId: number) {
    const result = await db
      .select({
        // Session fields
        sessionId: writingSessions.id,
        sessionNumber: writingSessions.sessionNumber,
        startTime: writingSessions.startTime,
        endTime: writingSessions.endTime,
        contentAtStart: writingSessions.contentAtStart,
        contentAtEnd: writingSessions.contentAtEnd,
        questionsTriggered: writingSessions.questionsTriggered,
        questionsCompleted: writingSessions.questionsCompleted,
        
        // Question fields (nullable since not all sessions have questions)
        questionId: sessionQuestions.id,
        questionNumber: sessionQuestions.questionNumber,
        question: sessionQuestions.question,
        answer: sessionQuestions.answer,
        timeToAnswer: sessionQuestions.timeToAnswer,
        timedOut: sessionQuestions.timedOut,
        generatedAt: sessionQuestions.generatedAt,
        askedAt: sessionQuestions.askedAt,
        answeredAt: sessionQuestions.answeredAt,
        contextContent: sessionQuestions.contextContent
      })
      .from(writingSessions)
      .leftJoin(sessionQuestions, eq(writingSessions.id, sessionQuestions.sessionId))
      .where(eq(writingSessions.submissionId, submissionId))
      .orderBy(writingSessions.sessionNumber, sessionQuestions.questionNumber);

    // Group the results by session
    const sessionsMap = new Map();
    
    for (const row of result) {
      if (!sessionsMap.has(row.sessionId)) {
        sessionsMap.set(row.sessionId, {
          id: row.sessionId,
          sessionNumber: row.sessionNumber,
          startTime: row.startTime,
          endTime: row.endTime,
          contentAtStart: row.contentAtStart,
          contentAtEnd: row.contentAtEnd,
          questionsTriggered: row.questionsTriggered,
          questionsCompleted: row.questionsCompleted,
          questions: []
        });
      }
      
      // Add question if it exists
      if (row.questionId) {
        sessionsMap.get(row.sessionId).questions.push({
          id: row.questionId,
          questionNumber: row.questionNumber,
          question: row.question,
          answer: row.answer,
          timeToAnswer: row.timeToAnswer,
          timedOut: row.timedOut,
          generatedAt: row.generatedAt,
          askedAt: row.askedAt,
          answeredAt: row.answeredAt,
          contextContent: row.contextContent
        });
      }
    }
    
    return Array.from(sessionsMap.values());
  }

  private async getStudentIdFromSubmission(submissionId: number): Promise<number> {
    const submission = await db
      .select({ studentId: submissions.studentId })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);

    if (submission.length === 0) {
      throw new Error('Submission not found');
    }

    return submission[0].studentId;
  }

  async clearStorage(): Promise<void> {
    await db.delete(sessionQuestions);
    await db.delete(writingSessions);
    await db.delete(submissionVersions);
    await db.delete(submissions);
    await db.delete(classStudents);
    await db.delete(assignments);
    await db.delete(classes);
    await db.delete(users);
  }
}

export const storage = new DatabaseStorage();