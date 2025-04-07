import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Editor } from "./editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Assignment, Submission } from "@shared/schema";
import { Loader2, Plus, Quote, X, History } from "lucide-react";
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
  const [quotes, setQuotes] = useState<QuoteItem[]>(initialDraft?.quotes as QuoteItem[] || []);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [newQuote, setNewQuote] = useState<QuoteItem>({ text: "", source: "", insertedAt: "" });
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(initialDraft?.submittedAt ? new Date(initialDraft.submittedAt) : null);
  const [isSaving, setIsSaving] = useState(false);

  // Check if assignment is past due
  const isPastDue = new Date(assignment.dueDate) < new Date();

  const saveDraftMutation = useMutation({
    mutationFn: async (data: SubmissionData) => {
      if (isPastDue) {
        throw new Error("Assignment deadline has passed");
      }
      const res = await apiRequest("POST", "/api/submissions", {
        assignmentId: assignment.id,
        content: data.content,
        keystrokes: data.keystrokes,
        quotes: data.quotes || quotes,
        is_draft: true
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
        description: "Your assignment has been moved to My Submissions",
      });

      // Invalidate all relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/classes/${assignment.classId}/submissions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/classes/${assignment.classId}/assignments`] });

      // Clear auto-save timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        setAutoSaveTimer(null);
      }

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

  // // Auto-save functionality
  // useEffect(() => {
  //   if (!isPastDue && initialDraft?.is_draft !== false && !isSaving) {
  //     if (autoSaveTimer) {
  //       clearTimeout(autoSaveTimer);
  //     }

  //     const timer = setTimeout(() => {
  //       if (content) {
  //         setIsSaving(true);
  //         saveDraftMutation.mutate(
  //           { content, keystrokes, quotes },
  //           {
  //             onSuccess: () => {
  //               // Refresh the draft data
  //               queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignment.id}/draft`] });
  //             },
  //             onSettled: () => {
  //               setIsSaving(false);
  //             }
  //           }
  //         );
  //       }
  //     }, 15000); // Auto-save after 15 seconds of inactivity

  //     setAutoSaveTimer(timer);
  //   }

  //   return () => {
  //     if (autoSaveTimer) {
  //       clearTimeout(autoSaveTimer);
  //     }
  //   };
  // }, [content, keystrokes, quotes, isSaving, isPastDue, initialDraft?.is_draft]);
  
  // // Save content when user leaves/unmounts the component
  // useEffect(() => {
  //   // Add a beforeunload event to catch browser/tab closes
  //   const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  //     if (!isPastDue && initialDraft?.is_draft !== false && content && !isSaving) {
  //       // Save immediately before the page unloads
  //       fetch('/api/submissions', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({
  //           assignmentId: assignment.id,
  //           content,
  //           keystrokes,
  //           quotes,
  //           is_draft: true
  //         }),
  //         // Use keepalive to ensure the request completes even if the page is unloading
  //         keepalive: true
  //       });
        
  //       // Standard beforeunload behavior to prompt user confirmation
  //       e.preventDefault();
  //       e.returnValue = '';
  //     }
  //   };
    
  //   window.addEventListener('beforeunload', handleBeforeUnload);
    
  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
      
  //     // Save draft when component unmounts (user navigates away or logs out)
  //     if (!isPastDue && initialDraft?.is_draft !== false && content && !isSaving) {
  //       setIsSaving(true);
  //       saveDraftMutation.mutate({ content, keystrokes, quotes });
  //     }
  //   };
  // }, [content, keystrokes, quotes, isPastDue, initialDraft?.is_draft, assignment.id, isSaving]);

  

  const handleSaveDraft = () => {
    // Manual save should always work regardless of isSaving state
    setIsSaving(true);
    saveDraftMutation.mutate(
      { content, keystrokes, quotes },
      {
        onSuccess: () => {
          // Refresh the assignment data to confirm it's saved properly
          queryClient.invalidateQueries({ queryKey: [`/api/assignments/${assignment.id}/draft`] });
          
          // toast({
          //   title: "Draft saved successfully",
          //   description: "Your work has been saved to the server.",
          //   variant: "default"
          // });
        },
        onSettled: () => {
          setIsSaving(false);
        }
      }
    );
  };
  
  // Store cursor position for quote insertion
  const [cursorPosition, setCursorPosition] = useState<{start: number, end: number} | null>(null);
  
  // State to track if we're currently dragging over the editor
  // No longer needed for click-to-insert functionality
  
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
    const quoteWithPosition = {
      ...quoteWithTimestamp,
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

        {/* Quote List Display */}
        {quotes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Quotes Used ({quotes.length})</h3>
            <p className="text-xs text-muted-foreground mb-2">Click on a quote to insert it at the cursor position</p>
            <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">
              {quotes.map((quote, index) => (
                <div 
                  key={index} 
                  className="p-3 bg-muted rounded-md relative group"
                >
                  <div 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-background rounded-full p-1"
                    onClick={() => {
                      // Only allow quote deletion in draft mode
                      if (isPastDue || initialDraft?.is_draft === false) return;
                      
                      // Remove the quote from the quotes array
                      const updatedQuotes = [...quotes];
                      updatedQuotes.splice(index, 1);
                      setQuotes(updatedQuotes);
                      
                      // We need to find the quote in the content and remove it
                      // Try using position if available, or search for the quote text
                      const searchAndRemoveQuote = () => {
                        // Format the quote text to search for
                        const quoteText = `"${quote.text}" [${quote.source}${quote.page ? ` p. ${quote.page}` : ''}]`;
                        const quoteIndex = content.indexOf(quoteText);
                        
                        if (quoteIndex !== -1) {
                          // We found the quote in the content, now remove it
                          const newContent = 
                            content.substring(0, quoteIndex) + 
                            content.substring(quoteIndex + quoteText.length);
                          
                          return newContent;
                        }
                        return null; // Quote not found
                      };
                      
                      // Check if position is tracked and valid
                      let newContent = null;
                      if (quote.position) {
                        const start = quote.position.start;
                        const end = quote.position.end;
                        
                        // Verify that the range actually contains the quote
                        const extractedQuote = content.substring(start, end);
                        if (extractedQuote.includes(quote.text) && extractedQuote.includes(quote.source)) {
                          // Position info is correct, use it
                          newContent = content.substring(0, start) + content.substring(end);
                        }
                      }
                      
                      // If position-based removal failed, try text-based removal
                      if (!newContent) {
                        newContent = searchAndRemoveQuote();
                      }
                      
                      // If we successfully found and removed the quote
                      if (newContent) {
                        setContent(newContent);
                        
                        // Save the updated content
                        setIsSaving(true);
                        saveDraftMutation.mutate(
                          { 
                            content: newContent, 
                            keystrokes, 
                            quotes: updatedQuotes 
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
                        
                        toast({
                          title: "Quote removed",
                          description: "The quote has been removed from your essay."
                        });
                      } else {
                        // If we couldn't find the quote in the content, just update the quotes list
                        toast({
                          title: "Quote removed from list",
                          description: "The quote was removed from your quotes list but couldn't be found in the essay text."
                        });
                        
                        setIsSaving(true);
                        saveDraftMutation.mutate(
                          { 
                            content, 
                            keystrokes, 
                            quotes: updatedQuotes 
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
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </div>
                  
                  <div 
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => {
                      // Don't allow inserting quotes if not in draft mode
                      if (isPastDue || initialDraft?.is_draft === false) return;
                      
                      // Format the quote with the requested [source p. xxx] format without HTML
                      const formattedQuote = `"${quote.text}" [${quote.source}${quote.page ? ` p. ${quote.page}` : ''}]`;
                      
                      // We're still tracking this in our system as if it were the old format
                      // This is just for display purposes
                      
                      // Use the stored cursor position or default to the end
                      const position = cursorPosition || { 
                        start: content.length, 
                        end: content.length 
                      };
                      
                      // Insert at the cursor position
                      const newContent = 
                        content.substring(0, position.start) + 
                        formattedQuote + 
                        content.substring(position.end);
                      
                      setContent(newContent);
                      
                      // Track the position for potential deletion later
                      const updatedQuotes = [...quotes];
                      updatedQuotes[index] = {
                        ...quote,
                        position: {
                          start: position.start,
                          end: position.start + formattedQuote.length
                        }
                      };
                      
                      setQuotes(updatedQuotes);
                      
                      // Save the updated content
                      setIsSaving(true);
                      saveDraftMutation.mutate(
                        { 
                          content: newContent, 
                          keystrokes, 
                          quotes: updatedQuotes 
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
                      
                      // Focus and position cursor after the quote
                      setTimeout(() => {
                        const textarea = document.querySelector('textarea');
                        if (textarea) {
                          textarea.focus();
                          const newCursorPos = position.start + formattedQuote.length;
                          textarea.setSelectionRange(newCursorPos, newCursorPos);
                        }
                      }, 100);
                      
                      toast({
                        title: "Quote inserted",
                        description: "Quote was inserted at the cursor position."
                      });
                    }}
                  >
                    <div className="italic text-sm">"{quote.text}"</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Source: {quote.source}
                      {quote.page && <span> (p. {quote.page})</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div 
          onMouseUp={handleEditorClick}
          onKeyUp={handleEditorSelect}
          onFocus={handleEditorFocus}
          className={`${!isPastDue && initialDraft?.is_draft !== false ? 'editor-container' : ''}`}
        >
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
        
        {/* Insert Quote Button */}
        {!isPastDue && !(initialDraft && initialDraft.is_draft === false) && (
          <div className="flex justify-center">
            <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  disabled={isPastDue || Boolean(initialDraft && initialDraft.is_draft === false)}
                >
                  <Quote className="h-4 w-4" />
                  Insert Quote
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Insert Quote</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="quoteText">Quote Text</Label>
                    <Textarea 
                      id="quoteText" 
                      placeholder="Enter the quote text..." 
                      value={newQuote.text}
                      onChange={(e) => setNewQuote({...newQuote, text: e.target.value})}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="source">Source</Label>
                    <Input 
                      id="source" 
                      placeholder="Author, Book Title, etc." 
                      value={newQuote.source}
                      onChange={(e) => setNewQuote({...newQuote, source: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="page">Page Number (Optional)</Label>
                    <Input 
                      id="page" 
                      placeholder="e.g. 42" 
                      value={newQuote.page || ''}
                      onChange={(e) => setNewQuote({...newQuote, page: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>Cancel</Button>
                  <Button onClick={handleAddQuote}>Insert Quote</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {saveDraftMutation.isPending 
              ? "Saving..." 
              : lastSaved 
                ? `Last saved: ${lastSaved.toLocaleTimeString()}` 
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