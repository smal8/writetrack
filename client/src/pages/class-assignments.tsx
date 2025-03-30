import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssignmentForm } from "@/components/assignment-form";
import { Link } from "wouter";
import { Loader2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import type { Assignment, Class, Submission } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClassAssignmentsPage() {
  const { user } = useAuth();
  const [_, params] = useRoute("/classes/:id/assignments");
  const classId = parseInt(params?.id || "0");
  const [showNewAssignment, setShowNewAssignment] = useState(false);
  const [activeTab, setActiveTab] = useState('open');

  const classQuery = useQuery<Class>({
    queryKey: [`/api/classes/${classId}`],
  });

  const assignmentsQuery = useQuery<Assignment[]>({
    queryKey: [`/api/classes/${classId}/assignments`],
    enabled: !!classId,
  });

  const submissionsQuery = useQuery<Submission[]>({
    queryKey: [`/api/classes/${classId}/submissions`],
    enabled: !!classId,
  });

  if (classQuery.isLoading || assignmentsQuery.isLoading || submissionsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!classQuery.data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Class not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getOpenAssignments = () => {
    if (!assignmentsQuery.data || !submissionsQuery.data || !user) return [];

    const submittedAssignmentIds = new Set(
      submissionsQuery.data
        .filter(s => s.studentId === user.id && !s.is_draft)
        .map(s => s.assignmentId)
    );

    return assignmentsQuery.data.filter(assignment => 
      !submittedAssignmentIds.has(assignment.id)
    );
  };

  const getCompletedAssignments = () => {
    if (!assignmentsQuery.data || !submissionsQuery.data || !user) return [];

    const submittedAssignmentIds = new Set(
      submissionsQuery.data
        .filter(s => s.studentId === user.id && !s.is_draft)
        .map(s => s.assignmentId)
    );

    return assignmentsQuery.data.filter(assignment => 
      submittedAssignmentIds.has(assignment.id)
    );
  };

  const openAssignments = getOpenAssignments();
  const completedAssignments = getCompletedAssignments();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{classQuery.data.name}</h1>
          <p className="text-muted-foreground">{classQuery.data.description}</p>
        </div>
        {user?.isTeacher && (
          <Sheet open={showNewAssignment} onOpenChange={setShowNewAssignment}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Assignment
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create New Assignment</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <AssignmentForm classId={classId} />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="open">Open Assignments</TabsTrigger>
          <TabsTrigger value="completed">Completed Assignments</TabsTrigger>
          {user?.isTeacher && <TabsTrigger value="gradebook">Grade Book</TabsTrigger>}
        </TabsList>

        <TabsContent value="open">
          <Card>
            <CardHeader>
              <CardTitle>Open Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {openAssignments.map(assignment => (
                  <div key={assignment.id} className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{assignment.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </p>
                        <p className="mt-2">{assignment.description}</p>
                      </div>
                      <Button asChild>
                        <Link to={user?.isTeacher ? `/assignments/${assignment.id}/grade` : `/assignments/${assignment.id}`}>
                          {user?.isTeacher ? 'View Submissions' : 'Submit Assignment'}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {openAssignments.length === 0 && (
                  <p className="text-center text-muted-foreground">
                    No open assignments available.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedAssignments.map(assignment => {
                  const submission = submissionsQuery.data?.find(
                    s => s.assignmentId === assignment.id && s.studentId === user?.id
                  );

                  return (
                    <div key={assignment.id} className="bg-muted p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{assignment.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Completed: {submission && new Date(submission.submittedAt).toLocaleDateString()}
                          </p>
                          {submission && submission.grade !== null && (
                            <p className="mt-2 font-medium">
                              Grade: {submission.grade}/100
                            </p>
                          )}
                          {submission && submission.feedback && (
                            <p className="mt-2 text-sm text-muted-foreground">
                              Feedback: {submission.feedback}
                            </p>
                          )}
                        </div>
                        {submission && (
                          <Button asChild variant="outline">
                            <Link to={`/submissions/${submission.id}`}>View Submission</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {completedAssignments.length === 0 && (
                  <p className="text-center text-muted-foreground">
                    No completed assignments yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.isTeacher && (
          <TabsContent value="gradebook">
            <Card>
              <CardHeader>
                <CardTitle>Grade Book</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignmentsQuery.data?.map(assignment => {
                    const submissions = submissionsQuery.data?.filter(
                      s => s.assignmentId === assignment.id && !s.is_draft
                    ) || [];

                    const averageGrade = submissions.length > 0
                      ? submissions.reduce((acc, s) => acc + (s.grade || 0), 0) / submissions.length
                      : null;

                    return (
                      <div key={assignment.id} className="bg-muted p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold">{assignment.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              Due: {new Date(assignment.dueDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Submissions: {submissions.length}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Average Grade</p>
                            <p className="font-bold">{averageGrade?.toFixed(1) || 'N/A'}</p>
                          </div>
                        </div>
                        <Button asChild>
                          <Link to={`/assignments/${assignment.id}/grade`}>Grade Submissions</Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}