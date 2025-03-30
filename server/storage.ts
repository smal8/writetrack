import { assignments, submissions, users, classes, classStudents, submissionVersions } from "@shared/schema";
import type { Assignment, InsertAssignment, InsertStudent, InsertSubmission, InsertUser, Submission, User, GradeSubmission, Class, InsertClass, ClassStudent, InsertVersion, SubmissionVersion } from "@shared/schema";
import { db } from "./db";
import { eq, and, count, desc } from "drizzle-orm";
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

  // Submission version management
  createSubmissionVersion(version: InsertVersion): Promise<SubmissionVersion>;
  getSubmissionVersions(submissionId: number): Promise<SubmissionVersion[]>;
  getSubmissionVersion(versionId: number): Promise<SubmissionVersion | undefined>;
  restoreSubmissionVersion(submissionId: number, versionId: number): Promise<Submission>;

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
        submittedAt: new Date(),
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
        is_draft: true
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
    const [submission] = await db
      .select({
        submission: submissions,
        assignment: assignments
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, assignmentId),
          eq(submissions.studentId, studentId),
          eq(submissions.is_draft, true)
        )
      )
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId));

    if (!submission) return undefined;

    return {
      ...submission.submission,
      assignment: submission.assignment
    };
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
        quotes: version.quotes
      })
      .where(eq(submissions.id, submissionId))
      .returning();
    
    return submission;
  }

  async clearStorage(): Promise<void> {
    await db.delete(submissionVersions);
    await db.delete(submissions);
    await db.delete(classStudents);
    await db.delete(assignments);
    await db.delete(classes);
    await db.delete(users);
  }
}

export const storage = new DatabaseStorage();