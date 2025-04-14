import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Editor } from "./editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Assignment, Submission } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface SubmissionFormProps {
  assignment: Assignment;
  initialDraft?: Submission;
}

interface SubmissionData {
  content: string;
  keystrokes: any[];
}

export function SubmissionForm({ assignment, initialDraft }: SubmissionFormProps) {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [content, setContent] = useState(initialDraft?.content || "");
  const [keystrokes, setKeystrokes] = useState<any[]>(initialDraft?.keystrokes as any[] || []);
  const [lastSaved, setLastSaved] = useState<Date | null>(initialDraft?.submittedAt ? new Date(initialDraft.submittedAt) : null);
  const [isSaving, setIsSaving] = useState(false);

  // Check if assignment is past due
  const isPastDue = new Date(assignment.dueDate) < new Date();

  const saveDraftMutation = useMutation({
    mutationFn: async (data: { content: string, keystrokes: any[] }) => {
      if (isPastDue) {
        throw new Error("Assignment deadline has passed");
      }
      const currentTime = new Date();
      const res = await apiRequest("POST", "/api/submissions", {
        assignmentId: assignment.id,
        content: data.content,
        keystrokes: data.keystrokes,
        is_draft: true,
        submittedAt: currentTime.toISOString()
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Update the last saved timestamp from the server response
      setLastSaved(new Date(data.submittedAt));
      
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (isPastDue) {
        throw new Error("Assignment deadline has passed");
      }

      // First save the latest draft
      const saveRes = await apiRequest("POST", "/api/submissions", {
        assignmentId: assignment.id,
        content,
        keystrokes,
        is_draft: true
      });

      if (!saveRes.ok) throw new Error("Failed to save final draft");

      // Then finalize it
      const finalizeRes = await apiRequest("POST", `/api/submissions/${initialDraft?.id}/finalize`);
      if (!finalizeRes.ok) throw new Error("Failed to submit assignment");

      return finalizeRes.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your assignment has been moved to My Submissions",
      });

      // Invalidate all relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/classes/${assignment.classId}/submissions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/classes/${assignment.classId}/assignments`] });

      // Redirect to class assignments page with submitted tab active
      setLocation(`/classes/${assignment.classId}/assignments?tab=submitted`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveDraft = () => {
    setIsSaving(true);
    const currentContent = content;
    const currentKeystrokes = keystrokes;
    
    saveDraftMutation.mutate(
      { content: currentContent, keystrokes: currentKeystrokes },
      {
        onSuccess: (data) => {
          setLastSaved(new Date(data.submittedAt));
          // Don't refetch, just update the cache
          queryClient.setQueryData(
            [`/api/assignments/${assignment.id}/draft`],
            {
              ...data,
              content: currentContent,
              keystrokes: currentKeystrokes
            }
          );
          toast({
            title: "Draft saved",
            description: "Your work has been saved",
          });
        },
        onSettled: () => {
          setIsSaving(false);
        }
      }
    );
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Please write something before submitting",
        variant: "destructive",
      });
      return;
    }

    finalizeMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{assignment.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="prose prose-sm">
          <p>{assignment.description}</p>
          <p className="text-sm text-muted-foreground">
            Due: {new Date(assignment.dueDate).toLocaleDateString()}
          </p>
          {isPastDue && (
            <p className="text-sm text-destructive font-medium">
              This assignment is past due. You can no longer make changes.
            </p>
          )}
          {initialDraft && initialDraft.is_draft === false && (
            <p className="text-sm text-primary font-medium">
              You have already submitted this assignment for grading. No further changes can be made.
            </p>
          )}
        </div>

        {/* Show grade and feedback if graded */}
        {initialDraft && initialDraft.grade !== null && initialDraft.grade !== undefined && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Grade: {initialDraft.grade}/100</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm">
                <h3>Feedback</h3>
                <p>{initialDraft.feedback || "No feedback provided"}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="editor-container">
          <Editor
            value={content}
            onChange={(newContent, newKeystrokes) => {
              if (!isPastDue && initialDraft?.is_draft !== false) {
                setContent(newContent);
                setKeystrokes(newKeystrokes);
              }
            }}
            readOnly={isPastDue || initialDraft?.is_draft === false}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {saveDraftMutation.isPending 
              ? "Saving..." 
              : lastSaved 
                ? `Last saved: ${new Date(lastSaved).toLocaleString()}` 
                : "Not saved yet"
            }
          </div>
          <div className="space-x-2">
            <Button
              onClick={handleSaveDraft}
              disabled={saveDraftMutation.isPending || isPastDue || initialDraft?.is_draft === false}
              variant="outline"
            >
              {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={finalizeMutation.isPending || isPastDue || initialDraft?.is_draft === false}
            >
              {finalizeMutation.isPending ? "Submitting..." : "Submit for Grading"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}