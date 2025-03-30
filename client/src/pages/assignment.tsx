import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { SubmissionForm } from "@/components/submission-form";
import { Loader2 } from "lucide-react";
import type { Assignment, Submission } from "@shared/schema";

export default function AssignmentPage() {
  const [_, params] = useRoute("/assignments/:id");
  const assignmentId = parseInt(params?.id || "0");

  const assignmentQuery = useQuery<Assignment>({
    queryKey: [`/api/assignments/${assignmentId}`],
  });

  // Add query for draft submission
  const draftQuery = useQuery<Submission>({
    queryKey: [`/api/assignments/${assignmentId}/draft`],
    enabled: !!assignmentId,
  });

  if (assignmentQuery.isLoading || draftQuery.isLoading) {
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

  return (
    <div className="container mx-auto p-6">
      <SubmissionForm 
        assignment={assignmentQuery.data} 
        initialDraft={draftQuery.data}
      />
    </div>
  );
}