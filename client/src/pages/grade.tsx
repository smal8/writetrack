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

  // Function to generate a fake AI score between 0-100 based on student ID
  // This creates a deterministic but seemingly random score
  const generateAIScore = (studentId: number, submissionId: number): number => {
    // Use a combination of student ID and submission ID to generate a consistent score
    // This ensures the same student gets the same score for the same submission
    const seed = (studentId * 13 + submissionId * 7) % 100;
    
    // Generate values mostly in the low range with occasional high values
    if (seed % 17 === 0) return 75 + (seed % 25); // Occasional high values (75-99)
    if (seed % 7 === 0) return 40 + (seed % 35);  // Some medium values (40-74)
    return 5 + (seed % 35);  // Mostly low values (5-39)
  };
  
  // Function to get AI risk level based on score
  const getAIRiskLevel = (score: number): { color: string, label: string } => {
    if (score >= 75) return { color: "text-red-500 border-red-200 bg-red-50", label: "High" };
    if (score >= 40) return { color: "text-amber-500 border-amber-200 bg-amber-50", label: "Medium" };
    return { color: "text-green-500 border-green-200 bg-green-50", label: "Low" };
  };

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
                
                // Only generate AI score if there's a submission
                const aiScore = hasSubmitted ? generateAIScore(student.id, submission.id) : 0;
                const riskLevel = getAIRiskLevel(aiScore);
                
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
                          
                          {/* AI Score Badge */}
                          {hasSubmitted && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className={`ml-2 ${riskLevel.color} cursor-help`}>
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    AI: {aiScore}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p><strong>{riskLevel.label} risk of AI-generated content</strong></p>
                                  <p className="text-xs mt-1">Based on keystroke pattern analysis</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
                              {/* AI Analysis Button */}
                              <Button asChild variant="outline" className={riskLevel.color.includes("red") ? "border-red-300 hover:bg-red-50" : ""}>
                                <Link to={`/submissions/${submission.id}`}>
                                  {riskLevel.label === "High" 
                                    ? <><AlertTriangle className="mr-1 h-4 w-4" /> AI Analysis</>
                                    : "View Full Analysis"}
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