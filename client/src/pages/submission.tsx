import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradingForm } from "@/components/grading-form";
import { KeystrokeGraph } from "@/components/keystroke-graph";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Submission, Assignment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Function to render expanded quotes for teacher view
function renderTeacherContent(submission: Submission & { assignment: Assignment }) {
  if (!submission.quotes || submission.quotes.length === 0) {
    return submission.content;
  }
  
  // This function replaces [Quote X] placeholders with the actual quote content
  let enhancedContent = submission.content;
  
  // Type check and conversion for quotes
  const quotes = submission.quotes as { 
    text: string; 
    source: string; 
    page?: string;
    insertedAt: string; 
  }[];
  
  quotes.forEach((quote, index) => {
    // Create the quote marker pattern
    const placeholder = `[Quote ${index + 1}]`;
    
    // Create fully formatted quote with blockquote styling and indication for teachers
    const formattedQuote = `
    
// --- QUOTE ${index + 1} ---
> "${quote.text}"
> — ${quote.source}${quote.page ? `, p. ${quote.page}` : ''}
// --- END QUOTE ${index + 1} ---
    
`;
    
    // Replace all occurrences with the formatted quote
    enhancedContent = enhancedContent.replace(
      new RegExp(placeholder, 'g'), 
      formattedQuote
    );
  });
  
  return enhancedContent;
}

export default function SubmissionPage() {
  const { user } = useAuth();
  const [_, params] = useRoute("/submissions/:id");
  const submissionId = params?.id;
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const submissionQuery = useQuery<Submission & { assignment: Assignment }>({
    queryKey: [`/api/submissions/${submissionId}`],
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/finalize`);
      if (!response.ok) throw new Error('Failed to submit assignment');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Assignment submitted successfully",
        description: "Your essay has been submitted for grading.",
      });
      // Invalidate all relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submissionId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });

      // Get the class ID from the submission data
      const classId = submissionQuery.data?.assignment?.classId;
      if (classId) {
        queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/submissions`] });
        queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/assignments`] });
        // Redirect to the class assignments page with submitted tab active
        setLocation(`/classes/${classId}/assignments?tab=submitted`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit assignment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (submissionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!submissionQuery.data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Submission not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submission = submissionQuery.data;

  // Process keystroke data for visualization
  const keystrokes = submission.keystrokes as { timestamp: string; type: string; key?: string }[];
  const firstKeystroke = new Date(keystrokes[0]?.timestamp || submission.submittedAt);
  const totalTimeInMinutes = keystrokes.length > 0
    ? Math.round((new Date(submission.submittedAt).getTime() - firstKeystroke.getTime()) / 60000)
    : 0;

  // Calculate statistics
  const typingStats = keystrokes.reduce((acc, curr) => {
    if (curr.type === 'input') acc.characters++;
    if (curr.type === 'delete') acc.deletions++;
    return acc;
  }, { characters: 0, deletions: 0 });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Submission Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <h3>Essay Content</h3>
            <div className="bg-secondary/10 p-6 rounded-md whitespace-pre-wrap font-mono text-base text-foreground">
              {user?.isTeacher ? renderTeacherContent(submission) : submission.content}
            </div>

            {user?.isTeacher && submission.quotes && submission.quotes.length > 0 && (
              <>
                <h3 className="mt-8">Quotes Used</h3>
                <div className="space-y-4 mb-6">
                  <div className="bg-muted rounded-md p-4">
                    <h4 className="font-semibold mb-3">All Quotes ({(submission.quotes as any[]).length})</h4>
                    <div className="space-y-3">
                      {(submission.quotes as any[]).map((quote, index) => (
                        <div key={index} className="bg-secondary/20 p-3 rounded-md">
                          <p className="italic mb-1">"{quote.text}"</p>
                          <p className="text-sm text-muted-foreground">
                            Source: {quote.source}
                            {quote.page && <span> (p. {quote.page})</span>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Added: {new Date(quote.insertedAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {user?.isTeacher && (
              <>
                <h3 className="mt-8">Keystroke Analytics</h3>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-muted-foreground">Total Keystrokes</p>
                      <p className="text-2xl font-bold">{keystrokes.length}</p>
                    </div>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-muted-foreground">Characters Typed</p>
                      <p className="text-2xl font-bold">{typingStats.characters}</p>
                    </div>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-muted-foreground">Deletions</p>
                      <p className="text-2xl font-bold">{typingStats.deletions}</p>
                    </div>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-muted-foreground">Total Time</p>
                      <p className="text-2xl font-bold">{totalTimeInMinutes} min</p>
                    </div>
                  </div>

                  <KeystrokeGraph keystrokes={keystrokes} />

                  <div className="mt-4 bg-muted p-4 rounded-md">
                    <h4 className="font-semibold mb-2">Recent Keystrokes</h4>
                    <div className="space-y-2">
                      {keystrokes.slice(-10).map((keystroke, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{new Date(keystroke.timestamp).toLocaleTimeString()}</span>
                          <span className="text-muted-foreground">
                            {keystroke.type === 'input' ? `Typed: ${keystroke.key}` : 'Deletion'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - Fixed at bottom */}
      {!submission.grade && submission.is_draft && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="container mx-auto flex justify-end gap-4">
            <Button 
              variant="outline" 
              className="flex-1 max-w-[200px]"
              disabled={finalizeMutation.isPending}
            >
              Save Draft
            </Button>
            <Button 
              className="flex-1 max-w-[200px]"
              onClick={() => finalizeMutation.mutate()}
              disabled={finalizeMutation.isPending}
            >
              {finalizeMutation.isPending ? "Submitting..." : "Submit for Grading"}
            </Button>
          </div>
        </div>
      )}

      {submission.grade !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">{submission.grade}/100</p>
              <div className="prose prose-sm">
                <h3>Feedback</h3>
                <p>{submission.feedback}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {user?.isTeacher && submission.grade === null && (
        <Card>
          <CardHeader>
            <CardTitle>Grade Submission</CardTitle>
          </CardHeader>
          <CardContent>
            <GradingForm submission={submission} />
          </CardContent>
        </Card>
      )}

      {/* Add padding at the bottom to account for fixed buttons */}
      <div className="h-20" />
    </div>
  );
}