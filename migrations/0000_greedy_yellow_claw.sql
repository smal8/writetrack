CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"teacher_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"due_date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_students" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer NOT NULL,
	"student_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"teacher_id" integer NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "submission_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"content" text NOT NULL,
	"keystrokes" jsonb NOT NULL,
	"quotes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"version_number" integer NOT NULL,
	"version_name" text
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"content" text NOT NULL,
	"keystrokes" jsonb NOT NULL,
	"quotes" jsonb,
	"submitted_at" timestamp NOT NULL,
	"grade" integer,
	"feedback" text,
	"is_draft" boolean DEFAULT true NOT NULL,
	"ai_writing_quality_score" integer,
	"ai_writing_quality_confidence" integer,
	"ai_plagiarism_probability" integer,
	"ai_plagiarism_confidence" integer,
	"ai_analysis_date" timestamp,
	"ai_keystroke_count" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"is_teacher" boolean DEFAULT false NOT NULL,
	"student_id" text,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_student_id_unique" UNIQUE("student_id")
);
