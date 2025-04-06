import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard";
import AssignmentPage from "@/pages/assignment";
import SubmissionPage from "@/pages/submission";
import GradePage from "@/pages/grade";
import ClassPage from "@/pages/class-page";
import NotFound from "@/pages/not-found";
import ClassAssignmentsPage from "@/pages/class-assignments";
import CompletedAssignmentsPage from "@/pages/completed-assignments";
import CalendarPage from "@/pages/calendar";
import LandingPage from "@/pages/landing-page";
import React from "react";
import { useAuth } from "@/hooks/use-auth";

function WrappedRoute({ component: Component, ...props }: { component: React.ComponentType; path: string }) {
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  // If the auth is still loading, don't render any routes yet
  if (isLoading) {
    return null;
  }

  return (
    <Switch>
      {/* Public Route - Landing Page */}
      <Route path="/" component={user ? () => <WrappedRoute component={DashboardPage} path="/" /> : LandingPage} />
      
      {/* Authentication Routes */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Routes */}
      <ProtectedRoute path="/dashboard" component={() => <WrappedRoute component={DashboardPage} path="/dashboard" />} />
      <ProtectedRoute path="/classes" component={() => <WrappedRoute component={DashboardPage} path="/classes" />} />
      <ProtectedRoute path="/assignments/:id" component={() => <WrappedRoute component={AssignmentPage} path="/assignments/:id" />} />
      <ProtectedRoute path="/submissions/:id" component={() => <WrappedRoute component={SubmissionPage} path="/submissions/:id" />} />
      <ProtectedRoute path="/assignments/:id/grade" component={() => <WrappedRoute component={GradePage} path="/assignments/:id/grade" />} />
      <ProtectedRoute path="/classes/:id/students" component={() => <WrappedRoute component={ClassPage} path="/classes/:id/students" />} />
      <ProtectedRoute path="/classes/:id/assignments" component={() => <WrappedRoute component={ClassAssignmentsPage} path="/classes/:id/assignments" />} />
      <ProtectedRoute path="/completed-assignments" component={() => <WrappedRoute component={CompletedAssignmentsPage} path="/completed-assignments" />} />
      <ProtectedRoute path="/calendar" component={() => <WrappedRoute component={CalendarPage} path="/calendar" />} />
      
      {/* 404 Route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;