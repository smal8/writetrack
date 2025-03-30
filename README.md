# EduTrack - Advanced Educational Management Platform

An advanced educational management platform that enhances student-teacher interactions through intelligent assignment tracking and innovative user experiences.

## Features

- **User Authentication**: Secure login and registration system with role-based access (teachers and students)
- **Class Management**: Teachers can create classes and add students
- **Assignment Creation**: Teachers can create assignments with due dates
- **Submission System**: Students can draft, edit, and submit essays
- **Keystroke Tracking**: Monitors writing patterns for academic integrity
- **Quote Management**: Students can insert and manage quotes in their essays
- **Version History**: Save and restore previous drafts of submissions
- **Grading Interface**: Teachers can provide grades and feedback

## Technology Stack

- **Frontend**: React with TypeScript, TailwindCSS, Shadcn UI components
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with sessions
- **State Management**: TanStack Query (React Query)

## Getting Started

### Prerequisites

- Node.js (version 18.x or higher)
- PostgreSQL database

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/edutrack.git
   cd edutrack
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   - Create a `.env` file in the root directory
   - Add required environment variables (DATABASE_URL, SESSION_SECRET)

4. Run database migrations
   ```
   npm run db:push
   ```

5. Start the development server
   ```
   npm run dev
   ```

## Project Structure

- `/client`: Frontend React application
  - `/src/components`: Reusable React components
  - `/src/pages`: Page components
  - `/src/hooks`: Custom React hooks
  - `/src/lib`: Utility functions and configuration

- `/server`: Backend Express server
  - `/routes.ts`: API routes
  - `/storage.ts`: Database operations
  - `/auth.ts`: Authentication logic

- `/shared`: Shared code between frontend and backend
  - `/schema.ts`: Database schema and types

## License

This project is licensed under the MIT License - see the LICENSE file for details