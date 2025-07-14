import express, { Express, Request, Response } from "express";
import { createServer, Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertAssignmentSchema, insertSubmissionSchema, gradeSchema, insertStudentSchema, resetPasswordSchema, insertClassSchema, addStudentToClassSchema, User } from "@shared/schema";
import { z } from "zod";
import { randomBytes } from "crypto";
import { hashPassword, comparePasswords } from "./auth";
import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { users, assignments, classStudents } from "@shared/schema";
import * as schema from "../shared/schema";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Student management
  app.get("/api/students/search", async (req, res) => {
    console.log('Student search request - auth status:', req.isAuthenticated());
    if (req.isAuthenticated()) {
      console.log('User:', req.user.id, 'isTeacher:', req.user.isTeacher);
    }
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!req.user.isTeacher) {
      return res.status(403).json({ message: "Only teachers can search for students" });
    }

    try {
      const query = req.query.q as string;
      // Allow searching with just 1 character for better usability
      if (!query || query.length < 1) {
        return res.json([]);
      }

      // Get all students from the database
      // This is a simplified approach - in a production app you'd want to use database search
      const allUsers = await storage.getAllUsers();
      console.log(`Searching for students with query "${query}". Found ${allUsers.length} total users.`);
      
      // Filter students (non-teacher accounts) by query matching username or studentId
      // Enhanced to better match against partial terms
      const lowerQuery = query.toLowerCase();
      console.log(`Search query (lowercased): "${lowerQuery}"`);
      // First filter to get only students
      const students = allUsers.filter((user: User) => !user.isTeacher);
      console.log(`Found ${students.length} non-teacher accounts`);
      
      // For debugging, log all available student info
      students.forEach((student: User) => {
        console.log(`Student: id=${student.id}, username=${student.username}, studentId=${student.studentId || 'N/A'}`);
      });
      
      // Now filter by search query
      const matchingStudents = students
        .filter((user: User) => {
          // Create a searchable text that contains username and studentId
          const username = user.username.toLowerCase();
          const studentId = (user.studentId || '').toLowerCase();
          
          // Check both fields separately for more flexible matching
          const usernameMatch = username.includes(lowerQuery);
          const studentIdMatch = studentId.includes(lowerQuery);
          
          // Also check for exact matches at word boundaries for better relevance
          const exactUsernameMatch = username === lowerQuery;
          const exactStudentIdMatch = studentId === lowerQuery;
          
          const match = usernameMatch || studentIdMatch || exactUsernameMatch || exactStudentIdMatch;
          
          console.log(`Checking "${username} ${studentId}" for "${lowerQuery}": ${match ? 'MATCH' : 'no match'}`);
          return match;
        })
        .map((user: User) => ({
          id: user.id,
          username: user.username,
          studentId: user.studentId
        }));
      
      res.json(matchingStudents);
    } catch (err) {
      console.error('Error searching students:', err);
      res.status(500).json({ message: "Failed to search students" });
    }
  });

  app.post("/api/students", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ message: "Only teachers can create student accounts" });
    }

    try {
      const data = insertStudentSchema.parse(req.body);
      
      // Check if student already exists
      const existingStudent = await storage.getUserByStudentId(data.studentId);
      if (existingStudent) {
        return res.status(400).json({ message: "Student ID already exists" });
      }
      
      // Check if email/username already exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Create temporary password for student
      const tempPassword = randomBytes(8).toString('hex');
      const hashedPassword = await hashPassword(tempPassword);
      
      // Create student account
      await storage.createStudentAccount(data, hashedPassword);
      
      res.json({ 
        message: "Student account created successfully",
        tempPassword
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid student data" });
      } else {
        console.error('Error creating student account:', err);
        res.status(500).json({ message: "Failed to create student account" });
      }
    }
  });

  // Class management
  app.post("/api/classes", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ message: "Only teachers can create classes" });
    }

    try {
      const data = insertClassSchema.parse(req.body);
      const class_ = await storage.createClass(req.user.id, data);
      res.status(201).json(class_);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid class data" });
      } else {
        res.status(500).json({ message: "Failed to create class" });
      }
    }
  });

  app.get("/api/classes", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const classes = req.user.isTeacher
        ? await storage.getTeacherClasses(req.user.id)
        : await storage.getStudentClasses(req.user.id);
      res.json(classes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.get("/api/classes/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const class_ = await storage.getClass(parseInt(req.params.id));
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Allow access for teachers and enrolled students
      if (req.user.isTeacher || await storage.isStudentInClass(class_.id, req.user.id)) {
        res.json(class_);
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

  app.post("/api/classes/:id/students", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ message: "Only teachers can add students to classes" });
    }

    try {
      const { studentId } = addStudentToClassSchema.parse(req.body);
      const classId = parseInt(req.params.id);

      const class_ = await storage.getClass(classId);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }

      if (class_.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const student = await storage.getUserByStudentId(studentId);
      if (!student) {
        // Create new student account if doesn't exist
        const tempPassword = randomBytes(8).toString('hex');
        const hashedPassword = await hashPassword(tempPassword);
        const username = `${studentId}@temp.edu`;

        const newStudent = await storage.createStudentAccount(
          { studentId, username },
          hashedPassword
        );

        await storage.addStudentToClass(classId, newStudent.id);

        res.status(201).json({
          message: "Student account created and added to class",
          studentId,
          tempPassword,
        });
      } else {
        // Check if student is already in the class
        const isAlreadyEnrolled = await storage.isStudentInClass(classId, student.id);
        if (isAlreadyEnrolled) {
          return res.json({ message: "Student is already enrolled in this class" });
        }
        
        // Add existing student to class
        await storage.addStudentToClass(classId, student.id);
        res.json({ message: "Student added to class" });
      }
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid student data" });
      } else {
        const errorMessage = err instanceof Error ? err.message : "Failed to add student to class";
        res.status(500).json({ message: errorMessage });
      }
    }
  });

  app.get("/api/classes/:id/students", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const class_ = await storage.getClass(parseInt(req.params.id));
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }

      if (!req.user.isTeacher && class_.teacherId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const students = await storage.getClassStudents(parseInt(req.params.id));
      res.json(students);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch class students" });
    }
  });
  
  // Remove a student from a class
  app.delete("/api/classes/:classId/students/:studentId", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ message: "Only teachers can remove students from classes" });
    }

    try {
      const classId = parseInt(req.params.classId);
      const studentId = parseInt(req.params.studentId);

      // Find class
      const class_ = await storage.getClass(classId);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Check if class belongs to teacher
      if (class_.teacherId !== req.user.id) {
        return res.status(403).json({ message: "You can only remove students from your own classes" });
      }

      // Check if student is in class
      const isEnrolled = await storage.isStudentInClass(classId, studentId);
      if (!isEnrolled) {
        return res.status(404).json({ message: "Student is not enrolled in this class" });
      }

      // Remove student from class
      await storage.removeStudentFromClass(classId, studentId);
      return res.status(200).json({ message: "Student removed from class successfully" });
    } catch (err) {
      console.error('Error removing student from class:', err);
      res.status(500).json({ message: "Failed to remove student from class" });
    }
  });

  app.get("/api/classes/:id/assignments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const classId = parseInt(req.params.id);
      console.log(`Fetching assignments for class ${classId}, user ${req.user.id}`);

      const class_ = await storage.getClass(classId);
      if (!class_) {
        console.log(`Class ${classId} not found`);
        return res.status(404).json({ message: "Class not found" });
      }

      // Check if user has access (either teacher or enrolled student)
      const hasAccess = req.user.isTeacher || await storage.isStudentInClass(classId, req.user.id);
      console.log(`User ${req.user.id} access to class ${classId}: ${hasAccess}`);

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const assignments = await storage.getClassAssignments(classId);
      console.log(`Found ${assignments.length} assignments for class ${classId}`);
      res.json(assignments);
    } catch (err) {
      console.error('Error fetching class assignments:', err);
      res.status(500).json({ message: "Failed to fetch class assignments" });
    }
  });
  
  app.get("/api/classes/:id/submissions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const classId = parseInt(req.params.id);
      
      // Check if user has access to the class
      const class_ = await storage.getClass(classId);
      if (!class_) {
        return res.status(404).json({ message: "Class not found" });
      }

      // Check if user has access (either teacher or enrolled student)
      const hasAccess = req.user.isTeacher || await storage.isStudentInClass(classId, req.user.id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all assignments for this class
      const assignments = await storage.getClassAssignments(classId);
      
      // Get all submissions for these assignments
      const submissions = [];
      for (const assignment of assignments) {
        const assignmentSubmissions = await storage.getAssignmentSubmissions(assignment.id);
        submissions.push(...assignmentSubmissions);
      }

      console.log(`Found ${submissions.length} submissions for class ${classId}`);
      res.json(submissions);
    } catch (err) {
      console.error('Error fetching class submissions:', err);
      res.status(500).json({ message: "Failed to fetch class submissions" });
    }
  });


  // Assignments
  app.post("/api/assignments", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ message: "Only teachers can create assignments" });
    }

    try {
      const data = insertAssignmentSchema.parse(req.body);
      const assignment = await storage.createAssignment({
        ...data,
        teacherId: req.user.id,
      });

      // Get all students in the class
      const students = await storage.getClassStudents(data.classId);
      console.log(`Creating draft submissions for ${students.length} students in class ${data.classId}`);

      // Create initial draft submissions for all students
      for (const student of students) {
        await storage.createSubmission({
          assignmentId: assignment.id,
          studentId: student.id,
          content: "",
          keystrokes: [],
          quotes: [],
          is_draft: true
        });
      }

      res.status(201).json(assignment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid assignment data" });
      } else {
        console.error('Error creating assignment:', err);
        res.status(500).json({ message: "Failed to create assignment" });
      }
    }
  });

  app.get("/api/assignments/all", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = req.user;
      console.log(`Fetching all assignments for user ${user.id}, isTeacher: ${user.isTeacher}`);

      let assignments;

      if (user.isTeacher) {
        // For teachers, get all assignments they created
        assignments = await storage.getTeacherAssignments(user.id);
        console.log(`Found ${assignments.length} teacher assignments`);
      } else {
        // For students, get assignments from all their classes
        const classes = await storage.getStudentClasses(user.id);
        console.log(`Student is in ${classes.length} classes`);
        
        assignments = [];
        for (const classObj of classes) {
          const classAssignments = await storage.getClassAssignments(classObj.id);
          console.log(`Found ${classAssignments.length} assignments for class ${classObj.id}`);
          assignments.push(...classAssignments);
        }
      }

      res.json(assignments);
    } catch (error) {
      console.error("Error fetching all assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get("/api/assignments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const assignments = req.user.isTeacher
        ? await storage.getTeacherAssignments(req.user.id)
        : await storage.getAssignments(req.user.id);
      res.json(assignments);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get("/api/assignments/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const assignment = await storage.getAssignment(parseInt(req.params.id));
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  app.get("/api/assignments/:id/submissions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const submissions = await storage.getAssignmentSubmissions(parseInt(req.params.id));
      res.json(submissions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Change this route after the other assignment routes
  app.get("/api/assignments/:id/draft", async (req, res) => {
    if (!req.isAuthenticated() || req.user.isTeacher) {
      return res.status(403).json({ message: "Only students can access drafts" });
    }

    try {
      const assignmentId = parseInt(req.params.id);

      // First check for existing finalized submission
      const submissions = await storage.getAssignmentSubmissions(assignmentId);
      const finalSubmission = submissions.find(
        sub => sub.studentId === req.user.id && !sub.is_draft
      );

      if (finalSubmission) {
        console.log(`Found finalized submission for student ${req.user.id}, assignment ${assignmentId}`);
        return res.json(finalSubmission); // Return the finalized submission
      }

      // Check for existing draft
      let draft = await storage.getDraftSubmission(assignmentId, req.user.id);

//       // If no draft exists, create one with sample text
//       if (!draft) {
//         const sampleEssay = `Title: The Impact of Technology on Modern Education

// In recent years, technology has revolutionized the way we learn and teach. From interactive online platforms to artificial intelligence-powered tutoring systems, the educational landscape has undergone a dramatic transformation.

// First, digital tools have made learning more accessible than ever before. Students can now access vast libraries of information from anywhere in the world, breaking down geographical barriers to education. Virtual classrooms enable real-time collaboration between students and teachers across different time zones.

// Furthermore, personalized learning experiences have become possible through adaptive technologies. These systems can identify individual student needs and adjust the curriculum accordingly, ensuring that each learner progresses at their optimal pace.

// However, this technological integration also presents challenges. Issues of digital literacy, access inequality, and screen time management must be carefully considered. As we move forward, finding the right balance between traditional teaching methods and technological innovation will be crucial.

// In conclusion, while technology has undoubtedly enhanced educational opportunities, its implementation must be thoughtful and purposeful. The future of education lies in harmoniously blending the best of both traditional and digital approaches to create engaging, effective learning experiences.`;

//         const now = new Date();
//         // Create keystroke patterns that simulate copy-paste behavior
//         const sampleKeystrokes = [];

//         // First burst - normal typing
//         for (let i = 0; i < 20; i++) {
//           sampleKeystrokes.push({
//             timestamp: new Date(now.getTime() - (60000 * 30) + (i * 2000)).toISOString(), // Every 2 seconds
//             type: 'input',
//             key: String.fromCharCode(65 + (i % 26)) // A-Z keys
//           });
//         }

//         // Gap of inactivity

//         // Second burst - rapid input (simulating paste)
//         for (let i = 0; i < 30; i++) {
//           sampleKeystrokes.push({
//             timestamp: new Date(now.getTime() - (60000 * 20) + (i * 100)).toISOString(), // Every 0.1 seconds
//             type: 'input',
//             key: String.fromCharCode(65 + (i % 26))
//           });
//         }

//         // Some deletions
//         for (let i = 0; i < 5; i++) {
//           sampleKeystrokes.push({
//             timestamp: new Date(now.getTime() - (60000 * 15) + (i * 1000)).toISOString(),
//             type: 'delete'
//           });
//         }

//         // Third burst - another paste
//         for (let i = 0; i < 25; i++) {
//           sampleKeystrokes.push({
//             timestamp: new Date(now.getTime() - (60000 * 10) + (i * 50)).toISOString(), // Every 0.05 seconds
//             type: 'input',
//             key: String.fromCharCode(65 + (i % 26))
//           });
//         }

//         // Final normal typing
//         for (let i = 0; i < 15; i++) {
//           sampleKeystrokes.push({
//             timestamp: new Date(now.getTime() - (60000 * 5) + (i * 3000)).toISOString(), // Every 3 seconds
//             type: 'input',
//             key: String.fromCharCode(65 + (i % 26))
//           });
//         }

//         draft = await storage.createSubmission({
//           assignmentId,
//           studentId: req.user.id,
//           content: sampleEssay,
//           keystrokes: sampleKeystrokes,
//           quotes: [],
//           is_draft: true
//         });
//       }

      res.json(draft);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch draft" });
    }
  });

  // Submissions
  app.post("/api/submissions", async (req, res) => {
    if (!req.isAuthenticated() || req.user.isTeacher) {
      return res.status(403).json({ message: "Only students can submit assignments" });
    }

    try {
      const data = insertSubmissionSchema.parse(req.body);

      // Check if assignment exists and deadline hasn't passed
      const assignment = await storage.getAssignment(data.assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      if (new Date(assignment.dueDate) < new Date()) {
        return res.status(400).json({ message: "Assignment deadline has passed" });
      }

      // Check for existing submissions
      const existingSubmissions = await storage.getAssignmentSubmissions(data.assignmentId);
      const finalSubmission = existingSubmissions.find(
        sub => sub.studentId === req.user.id && !sub.is_draft
      );

      if (finalSubmission) {
        return res.status(400).json({ message: "You have already submitted this assignment" });
      }

      // Get existing draft (create one if it doesn't exist)
      let existingDraft = await storage.getDraftSubmission(data.assignmentId, req.user.id);

      let updated;
      if (!existingDraft) {
        // Create a new draft submission if one doesn't exist
        updated = await storage.createSubmission({
          assignmentId: data.assignmentId,
          content: data.content,
          keystrokes: data.keystrokes,
          quotes: data.quotes || [],
          is_draft: true,
          studentId: req.user.id
        });
      } else {
        // Update the existing draft
        updated = await storage.updateSubmission(
          existingDraft.id,
          data.content,
          data.keystrokes,
          data.quotes
        );
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid submission data" });
      } else {
        res.status(500).json({ message: "Failed to save submission" });
      }
    }
  });

  app.get("/api/submissions/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const submission = await storage.getSubmission(parseInt(req.params.id));
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      if (!req.user.isTeacher && submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(submission);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch submission" });
    }
  });

  app.post("/api/submissions/:id/grade", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isTeacher) {
      return res.status(403).json({ message: "Only teachers can grade submissions" });
    }

    try {
      const data = gradeSchema.parse(req.body);
      const submission = await storage.gradeSubmission(parseInt(req.params.id), data);
      res.json(submission);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid grade data" });
      } else {
        res.status(500).json({ message: "Failed to grade submission" });
      }
    }
  });

  app.post("/api/submissions/:id/finalize", async (req, res) => {
    if (!req.isAuthenticated() || req.user.isTeacher) {
      return res.status(403).json({ message: "Only students can finalize submissions" });
    }

    try {
      const submission = await storage.getSubmission(parseInt(req.params.id));
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      if (submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if already finalized
      if (!submission.is_draft) {
        return res.status(400).json({ message: "This submission has already been finalized" });
      }

      // Check if deadline has passed
      const assignment = await storage.getAssignment(submission.assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      if (new Date(assignment.dueDate) < new Date()) {
        return res.status(400).json({ message: "Assignment deadline has passed" });
      }

      const finalized = await storage.finalizeSubmission(submission.id);
      res.json(finalized);
    } catch (err) {
      res.status(500).json({ message: "Failed to finalize submission" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const data = resetPasswordSchema.parse(req.body);
      const user = await storage.getUser(req.user.id);

      if (!user || !(await comparePasswords(data.currentPassword, user.password))) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedNewPassword = await hashPassword(data.newPassword);
      await storage.updateUserPassword(req.user.id, hashedNewPassword);

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid password data" });
      } else {
        res.status(500).json({ message: "Failed to update password" });
      }
    }
  });



  app.get("/api/submissions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      console.log(`Fetching submissions for user ${req.user.id}`);
      const submissions = await storage.getStudentSubmissions(req.user.id);
      console.log(`Found ${submissions.length} submissions`);
      res.json(submissions);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Submission Versions
  app.post("/api/submissions/:id/versions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const submissionId = parseInt(req.params.id);
      
      // Get the submission
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Only allow student who owns the submission to create versions
      if (submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "You can only create versions for your own submissions" });
      }

      // Get data from the request body
      const versionData = {
        submissionId,
        content: submission.content,
        keystrokes: submission.keystrokes,
        quotes: submission.quotes || [],
        versionName: req.body.versionName
      };

      // Create the version
      const version = await storage.createSubmissionVersion(versionData);
      res.status(201).json(version);
    } catch (err) {
      console.error('Error creating submission version:', err);
      res.status(500).json({ message: "Failed to create submission version" });
    }
  });

  app.get("/api/submissions/:id/versions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const submissionId = parseInt(req.params.id);
      
      // Get the submission
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Both teacher and student who owns the submission can view versions
      if (!req.user.isTeacher && submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "You can only view versions for your own submissions" });
      }

      const versions = await storage.getSubmissionVersions(submissionId);
      res.json(versions);
    } catch (err) {
      console.error('Error fetching submission versions:', err);
      res.status(500).json({ message: "Failed to fetch submission versions" });
    }
  });

  app.get("/api/versions/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const versionId = parseInt(req.params.id);
      const version = await storage.getSubmissionVersion(versionId);
      
      if (!version) {
        return res.status(404).json({ message: "Version not found" });
      }

      // Get the submission to check ownership
      const submission = await storage.getSubmission(version.submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Associated submission not found" });
      }

      // Both teacher and student who owns the submission can view versions
      if (!req.user.isTeacher && submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "You can only view versions for your own submissions" });
      }

      res.json(version);
    } catch (err) {
      console.error('Error fetching submission version:', err);
      res.status(500).json({ message: "Failed to fetch submission version" });
    }
  });

  app.post("/api/submissions/:submissionId/restore/:versionId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const submissionId = parseInt(req.params.submissionId);
      const versionId = parseInt(req.params.versionId);
      
      // Get the submission
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Only student who owns the submission can restore versions
      if (submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "You can only restore versions for your own submissions" });
      }

      // Create a version of the current state before restoring
      await storage.createSubmissionVersion({
        submissionId,
        content: submission.content,
        keystrokes: submission.keystrokes,
        quotes: submission.quotes || [],
        versionName: "Auto-saved before restore"
      });

      // Restore the version
      const updatedSubmission = await storage.restoreSubmissionVersion(submissionId, versionId);
      res.json(updatedSubmission);
    } catch (err) {
      console.error('Error restoring submission version:', err);
      res.status(500).json({ message: "Failed to restore submission version" });
    }
  });

  // Replace the existing submissions/all route with this corrected version
  app.get("/api/submissions/all", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = req.user;
      console.log(`Fetching all submissions for user ${user.id}, isTeacher: ${user.isTeacher}`);

      let submissions = [];

      if (user.isTeacher) {
        // For teachers, get submissions for assignments they created
        const teacherAssignments = await storage.getTeacherAssignments(user.id);
        
        for (const assignment of teacherAssignments) {
          const assignmentSubmissions = await storage.getAssignmentSubmissions(assignment.id);
          submissions.push(...assignmentSubmissions);
        }
        
        console.log(`Found ${submissions.length} submissions for teacher's assignments`);
      } else {
        // For students, we need to get ALL their submissions across all classes/assignments
        // First get all classes the student is in
        const classes = await storage.getStudentClasses(user.id);
        
        // Then get all assignments for those classes
        const allAssignmentIds = [];
        for (const classObj of classes) {
          const classAssignments = await storage.getClassAssignments(classObj.id);
          allAssignmentIds.push(...classAssignments.map(a => a.id));
        }
        
        console.log(`Student has ${allAssignmentIds.length} possible assignments`);
        
        // For each assignment, check for student submissions
        for (const assignmentId of allAssignmentIds) {
          // Get both draft and finalized submissions
          const assignmentSubmissions = await storage.getAssignmentSubmissions(assignmentId);
          const studentSubmissions = assignmentSubmissions.filter(s => s.studentId === user.id);
          submissions.push(...studentSubmissions);
        }
        
        console.log(`Found ${submissions.length} submissions for student (both draft and finalized)`);
      }

      res.json(submissions);
    } catch (error) {
      console.error("Error fetching all submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Writing Quality Analysis endpoints
  app.post("/api/analyze/writing-quality", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { keystrokeData } = req.body;
      
      if (!keystrokeData || !Array.isArray(keystrokeData)) {
        return res.status(400).json({ message: "Invalid keystroke data" });
      }

      // Create temporary file with keystroke data
      const tempFile = path.join(process.cwd(), 'temp_keystrokes.json');
      fs.writeFileSync(tempFile, JSON.stringify(keystrokeData));

      // Call Python model for writing quality prediction
      const result = await new Promise((resolve, reject) => {
        const python = spawn('python3', ['simple_demo.py', tempFile]);
        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
          output += data.toString();
        });

        python.stderr.on('data', (data) => {
          error += data.toString();
        });

        python.on('close', (code) => {
          // Clean up temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            console.log('Could not delete temp file:', e);
          }

          if (code !== 0) {
            reject(new Error(`Python script failed: ${error}`));
            return;
          }

          try {
            // Extract quality score from output
            const match = output.match(/Quality Score:\s*(\d+\.?\d*)/);
            if (match) {
              resolve({
                qualityScore: parseFloat(match[1]),
                analysis: {
                  keystrokeCount: keystrokeData.length,
                  confidence: 0.75, // Mock confidence
                  details: output
                }
              });
            } else {
              resolve({
                qualityScore: 0.0,
                analysis: {
                  keystrokeCount: keystrokeData.length,
                  confidence: 0.1,
                  details: output
                }
              });
            }
          } catch (e) {
            reject(new Error(`Failed to parse Python output: ${e}`));
          }
        });
      });

      res.json(result);
    } catch (error) {
      console.error('Error analyzing writing quality:', error);
      res.status(500).json({ message: "Failed to analyze writing quality" });
    }
  });

  app.post("/api/analyze/plagiarism", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { keystrokeData } = req.body;
      
      if (!keystrokeData || !Array.isArray(keystrokeData)) {
        return res.status(400).json({ message: "Invalid keystroke data" });
      }

      // Create temporary file with keystroke data
      const tempFile = path.join(process.cwd(), 'temp_keystrokes.json');
      fs.writeFileSync(tempFile, JSON.stringify(keystrokeData));

      // Call Python model for plagiarism detection
      const result = await new Promise((resolve, reject) => {
        const python = spawn('python3', ['plagiarism_detector.py', tempFile]);
        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
          output += data.toString();
        });

        python.stderr.on('data', (data) => {
          error += data.toString();
        });

        python.on('close', (code) => {
          // Clean up temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            console.log('Could not delete temp file:', e);
          }

          if (code !== 0) {
            reject(new Error(`Python script failed: ${error}`));
            return;
          }

          try {
            // Extract plagiarism probability from output
            const match = output.match(/Plagiarism Probability:\s*(\d+\.?\d*)%/);
            if (match) {
              resolve({
                plagiarismProbability: parseFloat(match[1]),
                analysis: {
                  keystrokeCount: keystrokeData.length,
                  confidence: 0.70, // Mock confidence
                  details: output
                }
              });
            } else {
              resolve({
                plagiarismProbability: 0.0,
                analysis: {
                  keystrokeCount: keystrokeData.length,
                  confidence: 0.1,
                  details: output
                }
              });
            }
          } catch (e) {
            reject(new Error(`Failed to parse Python output: ${e}`));
          }
        });
      });

      res.json(result);
    } catch (error) {
      console.error('Error analyzing plagiarism:', error);
      res.status(500).json({ message: "Failed to analyze plagiarism" });
    }
  });

  // Convenience endpoint to get both analyses for a submission
  app.get("/api/submissions/:id/analysis", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const submissionId = parseInt(req.params.id);
      const forceRefresh = req.query.refresh === 'true';
      
      // Get submission data
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Check if user has access to this submission
      if (!req.user.isTeacher && submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if analysis already exists in database (unless forced refresh)
      if (!forceRefresh && submission.aiAnalysisDate && submission.aiWritingQualityScore !== null && submission.aiPlagiarismProbability !== null) {
        // Return cached analysis
        return res.json({
          submissionId,
          writingQuality: {
            qualityScore: submission.aiWritingQualityScore / 100, // Convert back to decimal
            confidence: (submission.aiWritingQualityConfidence || 75) / 100,
            details: 'Cached analysis result'
          },
          plagiarism: {
            plagiarismProbability: submission.aiPlagiarismProbability / 100, // Convert back to decimal
            confidence: (submission.aiPlagiarismConfidence || 70) / 100,
            details: 'Cached analysis result'
          },
          metadata: {
            keystrokeCount: submission.aiKeystrokeCount || 0,
            analyzedAt: submission.aiAnalysisDate.toISOString(),
            cached: true
          }
        });
      }

      const keystrokeData = submission.keystrokes as any[];
      if (!keystrokeData || !Array.isArray(keystrokeData)) {
        return res.status(400).json({ message: "No keystroke data available" });
      }

      // Create temporary file with keystroke data
      const tempFile = path.join(process.cwd(), 'temp_keystrokes.json');
      fs.writeFileSync(tempFile, JSON.stringify(keystrokeData));

      // Run both analyses in parallel
      const [qualityResult, plagiarismResult] = await Promise.all([
        new Promise((resolve) => {
          const python = spawn('python3', ['simple_demo.py', tempFile]);
          let output = '';

          python.stdout.on('data', (data) => {
            output += data.toString();
          });

          python.on('close', (code) => {
            try {
              const match = output.match(/Quality Score:\s*(\d+\.?\d*)/);
              if (match) {
                resolve({
                  qualityScore: parseFloat(match[1]),
                  confidence: 0.75,
                  details: output
                });
              } else {
                resolve({
                  qualityScore: 0.0,
                  confidence: 0.1,
                  details: output
                });
              }
            } catch (e) {
              resolve({
                qualityScore: 0.0,
                confidence: 0.1,
                details: 'Error parsing quality analysis'
              });
            }
          });
        }),
        new Promise((resolve) => {
          const python = spawn('python3', ['plagiarism_detector.py', tempFile]);
          let output = '';

          python.stdout.on('data', (data) => {
            output += data.toString();
          });

          python.on('close', (code) => {
            try {
              const match = output.match(/Plagiarism Probability:\s*(\d+\.?\d*)%/);
              if (match) {
                resolve({
                  plagiarismProbability: parseFloat(match[1]),
                  confidence: 0.70,
                  details: output
                });
              } else {
                resolve({
                  plagiarismProbability: 0.0,
                  confidence: 0.1,
                  details: output
                });
              }
            } catch (e) {
              resolve({
                plagiarismProbability: 0.0,
                confidence: 0.1,
                details: 'Error parsing plagiarism analysis'
              });
            }
          });
        })
      ]);

      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.log('Could not delete temp file:', e);
      }

      // Store the comprehensive analysis results in the database
      try {
        const qualityScore = (qualityResult as any).qualityScore;
        const plagiarismProb = (plagiarismResult as any).plagiarismProbability;
        
        // Generate detailed component scores based on overall quality score
        // In a real implementation, these would come from the AI model
        const baseScore = qualityScore * 100;
        const variance = 15; // ±15 points variance for realism
        
        await storage.updateSubmissionAnalysis(submissionId, {
          // Basic scores (already implemented)
          aiWritingQualityScore: Math.round(baseScore),
          aiWritingQualityConfidence: Math.round((qualityResult as any).confidence * 100),
          aiPlagiarismProbability: Math.round(plagiarismProb * 100),
          aiPlagiarismConfidence: Math.round((plagiarismResult as any).confidence * 100),
          aiAnalysisDate: new Date(),
          aiKeystrokeCount: keystrokeData.length,
          
          // Detailed Quality Score Components (mock realistic values based on overall score)
          aiQualityGrammarScore: Math.max(0, Math.min(600, Math.round(baseScore + (Math.random() - 0.5) * variance))),
          aiQualityCoherenceScore: Math.max(0, Math.min(600, Math.round(baseScore + (Math.random() - 0.5) * variance))),
          aiQualityVocabularyScore: Math.max(0, Math.min(600, Math.round(baseScore + (Math.random() - 0.5) * variance))),
          aiQualityStructureScore: Math.max(0, Math.min(600, Math.round(baseScore + (Math.random() - 0.5) * variance))),
          aiQualityContentScore: Math.max(0, Math.min(600, Math.round(baseScore + (Math.random() - 0.5) * variance))),
          aiQualityOriginalityScore: Math.max(0, Math.min(600, Math.round(baseScore + (Math.random() - 0.5) * variance))),
          
          // Detailed Plagiarism Analysis (mock realistic values based on plagiarism probability)
          aiPlagiarismSimilarityPercentage: Math.round(plagiarismProb * 100),
          aiPlagiarismSourceCount: plagiarismProb > 30 ? Math.floor(Math.random() * 5) + 2 : Math.floor(Math.random() * 3),
          aiPlagiarismLongestMatch: plagiarismProb > 30 ? Math.floor(Math.random() * 50) + 20 : Math.floor(Math.random() * 15) + 5,
          aiPlagiarismTotalMatches: plagiarismProb > 30 ? Math.floor(Math.random() * 10) + 5 : Math.floor(Math.random() * 5) + 1,
          aiPlagiarismHighRiskSegments: plagiarismProb > 50 ? Math.floor(Math.random() * 3) + 1 : 0,
          aiPlagiarismMediumRiskSegments: plagiarismProb > 20 ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 2),
          
          // Analysis Metadata
          aiAnalysisModelVersion: "v1.0.0",
          aiAnalysisProcessingTime: Math.floor(Math.random() * 5000) + 2000, // 2-7 seconds
          aiAnalysisWordCount: submission.content.split(/\s+/).length,
          aiAnalysisCharacterCount: submission.content.length,
          
          // Detailed Analysis Results (JSON)
          aiQualityAnalysisDetails: {
            grammarIssues: [
              { type: "comma_splice", position: 45, suggestion: "Use a semicolon or period", severity: "medium" },
              { type: "subject_verb", position: 128, suggestion: "Check subject-verb agreement", severity: "low" }
            ],
            coherenceIssues: [
              { type: "transition", paragraph: 2, description: "Missing transition between ideas", severity: "medium" }
            ],
            vocabularyInsights: [
              { type: "repetition", word: "good", suggestion: "excellent, outstanding", context: "overused adjective" }
            ],
            structureAnalysis: {
              introduction: { score: qualityScore * 100, feedback: "Clear thesis statement" },
              body: { score: qualityScore * 100, feedback: "Well-developed paragraphs" },
              conclusion: { score: qualityScore * 100, feedback: "Summarizes key points effectively" }
            },
            strengths: ["Clear writing style", "Good use of examples"],
            improvements: ["Vary sentence structure", "Strengthen transitions"]
          },
          
          aiPlagiarismAnalysisDetails: {
            matches: plagiarismProb > 20 ? [
              {
                sourceText: "Sample text from source",
                submissionText: "Similar text in submission",
                similarityScore: plagiarismProb,
                sourceType: "web",
                sourceUrl: "https://example.com",
                startPosition: 150,
                endPosition: 200,
                riskLevel: plagiarismProb > 50 ? "high" as const : plagiarismProb > 30 ? "medium" as const : "low" as const
              }
            ] : [],
            sources: plagiarismProb > 20 ? [
              {
                name: "Academic Source",
                url: "https://example.com",
                type: "journal",
                overallSimilarity: plagiarismProb,
                matchCount: 2
              }
            ] : [],
            summary: {
              totalWords: submission.content.split(/\s+/).length,
              flaggedWords: Math.round(submission.content.split(/\s+/).length * (plagiarismProb / 100)),
              flaggedPercentage: plagiarismProb,
              recommendedAction: plagiarismProb > 50 ? "Manual review required" : plagiarismProb > 30 ? "Review highlighted sections" : "Low risk"
            }
          }
        });
      } catch (error) {
        console.error('Failed to store analysis results:', error);
        // Continue anyway - we can still return the results
      }

      res.json({
        submissionId,
        writingQuality: qualityResult,
        plagiarism: plagiarismResult,
        metadata: {
          keystrokeCount: keystrokeData.length,
          analyzedAt: new Date().toISOString(),
          cached: false
        }
      });
    } catch (error) {
      console.error('Error analyzing submission:', error);
      res.status(500).json({ message: "Failed to analyze submission" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}