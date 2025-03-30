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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type AddStudentToClass = z.infer<typeof addStudentToClassSchema>;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type GradeSubmission = z.infer<typeof gradeSchema>;
export type InsertVersion = z.infer<typeof insertVersionSchema>;

export type User = typeof users.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type ClassStudent = typeof classStudents.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type SubmissionVersion = typeof submissionVersions.$inferSelect;