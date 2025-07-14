import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradingForm } from "@/components/grading-form";
import { Loader2, FileText, Clock, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Assignment, Submission, User } from "@shared/schema";

export default function GradePage() {
  const [_, params] = useRoute("/assignments/:id/grade");
  const assignmentId = parseInt(params?.id || "0");

  const assignmentQuery = useQuery<Assignment>({
    queryKey: [`/api/assignments/${assignmentId}`],
  });

  const submissionsQuery = useQuery<Submission[]>({
    queryKey: [`/api/assignments/${assignmentId}/submissions`],
    enabled: !!assignmentId,
  });

  // Get all students in the class for this assignment
  const classStudentsQuery = useQuery<User[]>({
    queryKey: [`/api/classes/${assignmentQuery.data?.classId}/students`],
    enabled: !!assignmentQuery.data?.classId,
  });

  if (assignmentQuery.isLoading || submissionsQuery.isLoading || classStudentsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!assignmentQuery.data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Assignment not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Process all students to show their submission status
  const students = classStudentsQuery.data || [];
  const submissions = submissionsQuery.data || [];
  
  // Create a map of studentId to submission for quick lookup
  const submissionMap = new Map<number, Submission>();
  submissions.forEach((submission) => {
    if (!submission.is_draft) {
      submissionMap.set(submission.studentId, submission);
    }
  });



  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{assignmentQuery.data.title} - Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {students.length === 0 ? (
              <p className="text-center text-muted-foreground">No students enrolled in this class</p>
            ) : (
              students.map((student) => {
                const submission = submissionMap.get(student.id);
                const hasSubmitted = !!submission;
                

                
                return (
                  <Card key={student.id} className={hasSubmitted ? "" : "border-dashed border-muted"}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                          {student.username}
                          {!hasSubmitted && (
                            <Badge variant="outline" className="ml-2 text-orange-500 border-orange-200 bg-orange-50">
                              <XCircle className="h-3 w-3 mr-1" />
                              No Submission
                            </Badge>
                          )}
                          {hasSubmitted && submission.grade !== null && (
                            <Badge variant="outline" className="ml-2 text-green-500 border-green-200 bg-green-50">
                              Graded: {submission.grade}/100
                            </Badge>
                          )}
                          

                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!hasSubmitted ? (
                        <div className="flex justify-between items-start">
                          <p className="text-sm text-muted-foreground">Student has not submitted this assignment yet.</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">
                                <Clock className="inline mr-1 h-4 w-4" />
                                Submitted: {new Date(submission.submittedAt).toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground mb-4">
                                <FileText className="inline mr-1 h-4 w-4" />
                                Total keystrokes: {submission.keystrokes.length}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {/* View Submission Button */}
                              <Button asChild variant="outline">
                                <Link to={`/submissions/${submission.id}`}>
                                  <FileText className="mr-1 h-4 w-4" />
                                  View Submission
                                </Link>
                              </Button>
                            </div>
                          </div>

                          {submission.grade === null ? (
                            <GradingForm submission={submission} />
                          ) : (
                            <div>
                              <p className="font-bold">Grade: {submission.grade}/100</p>
                              <p className="text-muted-foreground mt-2">{submission.feedback}</p>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}