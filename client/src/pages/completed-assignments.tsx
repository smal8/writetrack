import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Assignment, Submission } from "@shared/schema";

export default function CompletedAssignmentsPage() {
  const { user } = useAuth();

  const submissionsQuery = useQuery<(Submission & { assignment: Assignment })[]>({
    queryKey: ["/api/submissions"],
    enabled: !!user && !user.isTeacher,
  });

  if (submissionsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!submissionsQuery.data || submissionsQuery.data.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Submissions</h1>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">No submissions found. Check your assignments page to start working on available assignments.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Submissions</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {submissionsQuery.data.map((submission) => (
          <Card key={submission.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{submission.assignment.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Class: {submission.assignment.name}
                  </p>
                </div>
                <div className="text-right">
                  {submission.grade !== null ? (
                    <div>
                      <p className="text-2xl font-bold">{submission.grade}/100</p>
                      {submission.feedback && (
                        <p className="text-sm text-muted-foreground mt-2 max-w-[300px] text-right">
                          {submission.feedback}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not graded yet</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button asChild variant="outline">
                  <Link to={`/submissions/${submission.id}`}>View Submission</Link>
                </Button>
                <Button asChild>
                  <Link to={`/classes/${submission.assignment.classId}/assignments`}>
                    Return to Class
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}