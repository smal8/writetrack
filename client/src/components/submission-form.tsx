import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Editor } from "./editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Assignment, Submission } from "@shared/schema";
import { Loader2, Plus, Quote, X, History, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VersionHistory } from "./version-history";
import { useWritingSession } from "@/hooks/use-writing-session";
import { SessionQuestionPopup } from "./session-question-popup";
import { SessionQuestionsSummary } from "./session-questions-summary";

interface SubmissionFormProps {
  assignment: Assignment;
  initialDraft?: Submission;
}

interface QuoteItem {
  text: string;
  source: string;
  page?: string;
  insertedAt: string;
  position?: {
    start: number;
    end: number;
  };
  index?: number;
}

interface SubmissionData {
  content: string;
  keystrokes: any[];
  quotes?: QuoteItem[];
}

export function SubmissionForm({ assignment, initialDraft }: SubmissionFormProps) {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [content, setContent] = useState(initialDraft?.content || "");
  const [keystrokes, setKeystrokes] = useState<any[]>(initialDraft?.keystrokes as any[] || []);
  const [lastSaved, setLastSaved] = useState<Date | null>(initialDraft?.submittedAt ? new Date(initialDraft.submittedAt) : null);
  const [isSaving, setIsSaving] = useState(false);
  const [quotes, setQuotes] = useState<QuoteItem[]>(initialDraft?.quotes || []);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [newQuote, setNewQuote] = useState<Partial<QuoteItem>>({ text: "", source: "", page: "" });
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);



  // Check if assignment is past due
  const isPastDue = new Date(assignment.dueDate) < new Date();

  // Sync component state when initialDraft prop changes (after query refetch)
  useEffect(() => {
    if (initialDraft) {
      setContent(initialDraft.content || "");
      setKeystrokes(initialDraft.keystrokes as any[] || []);
      setQuotes(initialDraft.quotes || []);
      setLastSaved(initialDraft.submittedAt ? new Date(initialDraft.submittedAt) : null);
    }
  }, [initialDraft]);

  // Silent save function for pre-question saves
  const silentSave = useCallback(async (contentToSave: string, keystrokesToSave: any[], quotesToSave: QuoteItem[]) => {
    if (isPastDue || initialDraft?.is_draft === false) {
      return; // Don't save if past due or already submitted
    }
    
    console.log('💾 Silently saving draft before questions...');
    const currentTime = new Date();
    
    const response = await apiRequest("POST", "/api/submissions", {
      assignmentId: assignment.id,
      content: contentToSave,
      keystrokes: keystrokesToSave,
      quotes: quotesToSave,
      is_draft: true,
      submittedAt: currentTime.toISOString()
    });
    
    if (!response.ok) {
      throw new Error('Failed to save draft');
    }
    
    const data = await response.json();
    setLastSaved(new Date(data.submittedAt));
    console.log('✅ Silent save completed before questions');
    
    // Invalidate the draft query to refresh the component data
    queryClient.invalidateQueries({ 
      queryKey: [`/api/assignments/${assignment.id}/draft`] 
    });
    
    return data;
  }, [assignment.id, isPastDue, initialDraft?.is_draft]);

  // Writing session management with auto-save before questions
  const writingSession = useWritingSession({
    submissionId: initialDraft?.id || 0,
    assignmentTitle: assignment.title,
    content,
    keystrokes,
    onQuestionsGenerated: async (questions) => {
      console.log('🔔 Questions generated:', questions.length, 'questions');
      
      try {
        // Save the current draft immediately before showing questions
        await silentSave(content, keystrokes, quotes);
        console.log('✅ Draft saved successfully before questions');
        
        // Wait a moment for the query invalidation to take effect
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('❌ Failed to save draft before questions:', error);
        // Continue showing questions even if save fails
      }
    },
    onSessionComplete: () => {
      // Silently refresh session data in background
      queryClient.invalidateQueries({ 
        queryKey: [`/api/submissions/${initialDraft?.id}/sessions`] 
      });
      
      toast({
        title: "Questions Completed",
        description: "Continue writing - questions will appear again after another 10 words.",
        duration: 2000,
      });
    }
  });

  // Debug logging for popup state
  useEffect(() => {
    console.log('🎭 Popup state update:', { 
      questionsLength: writingSession.questions.length, 
      isVisible: writingSession.showQuestions,
      currentWordCount: writingSession.currentWordCount,
      wordsUntilQuestions: writingSession.wordsUntilQuestions
    });
  }, [writingSession.showQuestions, writingSession.questions.length, writingSession.currentWordCount]);

  const saveDraftMutation = useMutation({
    mutationFn: async (data: { content: string, keystrokes: any[], quotes?: QuoteItem[] }) => {
      if (isPastDue) {
        throw new Error("Assignment deadline has passed");
      }
      const currentTime = new Date();
      const res = await apiRequest("POST", "/api/submissions", {
        assignmentId: assignment.id,
        content: data.content,
        keystrokes: data.keystrokes,
        quotes: data.quotes,
        is_draft: true,
        submittedAt: currentTime.toISOString()
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Update the last saved timestamp from the server response
      setLastSaved(new Date(data.submittedAt));
      
      // toast({
      //   title: "Success",
      //   description: "Your draft has been saved",
      // });

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
        quotes,
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
        description: "Your assignment has been submitted successfully!",
      });

      // Clear auto-save timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        setAutoSaveTimer(null);
      }

      // Reload the page as requested
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Small delay to show the success toast
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
  
  // Store cursor position for quote insertion
  const [cursorPosition, setCursorPosition] = useState<{start: number, end: number} | null>(null);
  
  // Update cursor position when the editor textarea is focused
  const handleEditorFocus = () => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      setCursorPosition({
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      });
    }
  };
  
  // Update cursor position when clicked in the editor
  const handleEditorClick = () => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      setCursorPosition({
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      });
    }
  };
  
  // Update cursor position when selection changes in the editor
  const handleEditorSelect = () => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      setCursorPosition({
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      });
    }
  };
  
  // Handle quote insertion
  const handleAddQuote = () => {
    if (!newQuote.text || !newQuote.source) {
      toast({
        title: "Missing information",
        description: "Please provide both quote text and source",
        variant: "destructive",
      });
      return;
    }
    
    // Add timestamp to the quote
    const quoteWithTimestamp = {
      ...newQuote,
      insertedAt: new Date().toISOString()
    };
    
    // Create a new array with the additional quote
    const nextQuoteNumber = quotes.length + 1;
    
    // Format the quote with the requested [source p. xxx] format without HTML
    const formattedQuote = `"${newQuote.text}" [${newQuote.source}${newQuote.page ? ` p. ${newQuote.page}` : ''}]`;
    
    // Use the stored cursor position or default to the end of the content
    const position = cursorPosition || { 
      start: content.length, 
      end: content.length 
    };
    
    // Insert the quote at the cursor position
    const newContent = 
      content.substring(0, position.start) + 
      formattedQuote + 
      content.substring(position.end);
    
    // Track the position for the new quote
    const quoteWithPosition: QuoteItem = {
      text: newQuote.text!,
      source: newQuote.source!,
      page: newQuote.page,
      insertedAt: quoteWithTimestamp.insertedAt,
      position: {
        start: position.start,
        end: position.start + formattedQuote.length
      }
    };
    
    // Update the quotes array with the positioned quote
    const positionedQuotes = [...quotes, quoteWithPosition];
    
    // Update state
    setContent(newContent);
    setQuotes(positionedQuotes);
    
    // Save immediately with the new quote
    setIsSaving(true);
    saveDraftMutation.mutate(
      { 
        content: newContent, 
        keystrokes, 
        quotes: positionedQuotes 
      },
      {
        onSuccess: () => {
          // Refresh the draft data
          queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignment.id}/draft`] });
        },
        onSettled: () => {
          setIsSaving(false);
        }
      }
    );
    
    // Reset form and close dialog
    setNewQuote({ text: "", source: "", insertedAt: "" });
    setShowQuoteDialog(false);
    
    // After quote insertion, focus the textarea and position cursor after the quote
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
        const newCursorPos = position.start + formattedQuote.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 100); // Small delay to ensure dialog is closed
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

        {/* Writing Progress - Word Count */}
        {!isPastDue && initialDraft?.is_draft !== false && (
          <Card className="mb-4 bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="font-medium">Writing Progress</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-mono font-bold text-primary">
                    {writingSession.currentWordCount} words
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {writingSession.wordsUntilQuestions} words until questions
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Questions appear every 10 words
              </div>
            </CardContent>
          </Card>
        )}

        {/* Editor blocking overlay */}
        {writingSession.isBlocked && (
          <Card className="mb-4 bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="font-medium text-orange-800">
                  {writingSession.isLoading ? 
                    "Saving your work and preparing questions..." :
                    "Questions are active - please answer them to continue writing"
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Questions Popup */}
        <SessionQuestionPopup
          questions={writingSession.questions}
          isVisible={writingSession.showQuestions}
          onComplete={writingSession.handleQuestionsComplete}
          onClose={writingSession.handleQuestionsClose}
        />

        <div 
          onMouseUp={handleEditorClick}
          onKeyUp={handleEditorSelect}
          onFocus={handleEditorFocus}
          className={`${!isPastDue && initialDraft?.is_draft !== false ? 'editor-container' : ''}`}
        >
          <Editor
            value={content}
            onChange={(newContent, newKeystrokes) => {
              if (!isPastDue && initialDraft?.is_draft !== false && !writingSession.isBlocked) {
                setContent(newContent);
                setKeystrokes(newKeystrokes);
              }
            }}
            readOnly={isPastDue || initialDraft?.is_draft === false || writingSession.isBlocked}
          />
        </div>
        
        

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowQuoteDialog(true)}>
              <Quote className="w-4 h-4 mr-2" />
              Add Quote
            </Button>
          </div>

          {quotes.length > 0 && (
            <div className="bg-muted rounded-md p-4">
              <h4 className="font-semibold mb-3">Quotes Used ({quotes.length})</h4>
              <div className="space-y-3">
                {quotes.map((quote, index) => (
                  <div key={index} className="bg-secondary/20 p-3 rounded-md flex justify-between items-start">
                    <div>
                      <p className="italic mb-1">"{quote.text}"</p>
                      <p className="text-sm text-muted-foreground">
                        Source: {quote.source}
                        {quote.page && <span> (p. {quote.page})</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Added: {new Date(quote.insertedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        const newContent = content.replace(`"${quote.text}" [${quote.source}${quote.page ? ` p. ${quote.page}` : ''}]`, '');
                        setContent(newContent);
                        setQuotes(quotes.filter((_, i) => i !== index));
                        handleSaveDraft();
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a Quote</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="quote">Quote Text</Label>
                  <Textarea
                    id="quote"
                    value={newQuote.text}
                    onChange={(e) => setNewQuote({ ...newQuote, text: e.target.value })}
                    placeholder="Paste your quote here..."
                  />
                </div>
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={newQuote.source}
                    onChange={(e) => setNewQuote({ ...newQuote, source: e.target.value })}
                    placeholder="Book or article title..."
                  />
                </div>
                <div>
                  <Label htmlFor="page">Page Number (Optional)</Label>
                  <Input
                    id="page"
                    value={newQuote.page}
                    onChange={(e) => setNewQuote({ ...newQuote, page: e.target.value })}
                    placeholder="e.g., 42"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>Cancel</Button>
                <Button onClick={handleAddQuote}>Add Quote</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Session Questions Summary - Only show for students with content and before submission */}
          {!isPastDue && initialDraft?.is_draft !== false && content.trim() && initialDraft?.id && (
            <SessionQuestionsSummary submissionId={initialDraft.id} />
          )}

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
        </div>
      </CardContent>
    </Card>
  );
}