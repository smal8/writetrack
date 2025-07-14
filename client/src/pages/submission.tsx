import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradingForm } from "@/components/grading-form";
import { KeystrokeGraph } from "@/components/keystroke-graph";
import { Loader2, AlertTriangle, ArrowLeft, Brain, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Submission, Assignment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { useState, useCallback, useEffect } from "react";

// Function to render expanded quotes for teacher view
function renderTeacherContent(submission: Submission & { assignment: Assignment }) {
  if (!submission.quotes || submission.quotes.length === 0) {
    return submission.content;
  }
  
  // This function replaces [Quote X] placeholders with the actual quote content
  let enhancedContent = submission.content;
  
  // Type check and conversion for quotes
//   const quotes = submission.quotes as { 
//     text: string; 
//     source: string; 
//     page?: string;
//     insertedAt: string; 
//   }[];
  
//   quotes.forEach((quote, index) => {
//     // Create the quote marker pattern
//     const placeholder = `[Quote ${index + 1}]`;
    
//     // Create fully formatted quote with blockquote styling and indication for teachers
//     const formattedQuote = `
    
// // --- QUOTE ${index + 1} ---
// > "${quote.text}"
// > — ${quote.source}${quote.page ? `, p. ${quote.page}` : ''}
// // --- END QUOTE ${index + 1} ---
    
// `;
    
//     // Replace all occurrences with the formatted quote
//     enhancedContent = enhancedContent.replace(
//       new RegExp(placeholder, 'g'), 
//       formattedQuote
//     );
//   });
  
  return enhancedContent;
}



// Interface for change fragments that track text changes
interface TextChange {
  timestamp: string;
  position: number;
  text: string;
  isDelete: boolean;
  length: number;
}

// Add AI Analysis interface
interface AIAnalysis {
  writingQuality: {
    qualityScore: number;
    confidence: number;
    details: string;
  };
  plagiarism: {
    plagiarismProbability: number;
    confidence: number;
    details: string;
  };
  metadata: {
    keystrokeCount: number;
    analyzedAt: string;
    cached: boolean;
  };
}

// Add AI Analysis Hook
function useAIAnalysis(submissionId: string) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Auto-load existing analysis when component mounts or submissionId changes
  useEffect(() => {
    if (submissionId && isInitialLoad) {
      loadExistingAnalysis();
    }
  }, [submissionId, isInitialLoad]);

  const loadExistingAnalysis = async () => {
    if (!submissionId) return;
    
    try {
      const response = await fetch(`/api/submissions/${submissionId}/analysis`);
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      }
      // If no existing analysis, that's fine - just don't set analysis
    } catch (err) {
      // If loading existing analysis fails, that's fine - user can still analyze
      console.log('No existing analysis found or failed to load');
    } finally {
      setIsInitialLoad(false);
    }
  };

  const analyzeSubmission = async (forceRefresh = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = `/api/submissions/${submissionId}/analysis${forceRefresh ? '?refresh=true' : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to analyze submission');
      }
      
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return { analysis, setAnalysis, loading, error, analyzeSubmission };
}

export default function SubmissionPage() {
  const { user } = useAuth();
  const [_, params] = useRoute("/submissions/:id");
  const submissionId = params?.id;
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State for the selected keystroke time range
  const [selectedKeystrokeRange, setSelectedKeystrokeRange] = useState<{
    startTime: string;
    endTime: string;
    keystrokes: any[];
  } | null>(null);
  
  // State for the essay content at different points in time
  const [essayAtTime, setEssayAtTime] = useState<{
    before: string;
    during: string;
    after: string;
    changes: TextChange[];
  } | null>(null);
  
  // State to track view mode
  const [viewMode, setViewMode] = useState<'full' | 'timeSelection'>('full');

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
  
  // Function to handle when a time range is selected in the keystroke graph
  const handleTimeRangeSelected = useCallback((startTime: string, endTime: string, keystrokesInRange: any[]) => {
    if (!startTime || !endTime || keystrokesInRange.length === 0) {
      // Reset the selection if empty
      setSelectedKeystrokeRange(null);
      setEssayAtTime(null);
      setViewMode('full');
      return;
    }
    
    // Set the selected time range
    setSelectedKeystrokeRange({
      startTime,
      endTime,
      keystrokes: keystrokesInRange,
    });
    
    // Change the view mode
    setViewMode('timeSelection');
  }, []);
  
  // Function to reconstruct essay content at specific time points
  const reconstructEssayAtTimePoints = useCallback((allKeystrokes: any[], targetKeystrokes: any[]) => {
    if (!allKeystrokes.length || !targetKeystrokes.length) return null;
    
    // Sort all keystrokes by timestamp
    const sortedKeystrokes = [...allKeystrokes].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Find the range of keystrokes for our target time period
    const targetStartTime = new Date(targetKeystrokes[0].timestamp).getTime();
    const targetEndTime = new Date(targetKeystrokes[targetKeystrokes.length - 1].timestamp).getTime();
    
    // Initialize the essay content
    let content = '';
    let beforeContent = '';
    let duringContent = '';
    const changes: TextChange[] = [];
    let currentPosition = 0;
    
    // Apply all keystrokes sequentially to reconstruct content at different points
    for (let i = 0; i < sortedKeystrokes.length; i++) {
      const keystroke = sortedKeystrokes[i];
      const keystrokeTime = new Date(keystroke.timestamp).getTime();
      
      // Determine if this keystroke is before, during, or after our target range
      const timePhase = 
        keystrokeTime < targetStartTime ? 'before' :
        keystrokeTime <= targetEndTime ? 'during' :
        'after';
      
      if (keystroke.type === 'input' && keystroke.key && keystroke.key.length === 1) {
        // Track the change
        if (timePhase === 'during') {
          changes.push({
            timestamp: keystroke.timestamp,
            position: currentPosition,
            text: keystroke.key,
            isDelete: false,
            length: 1
          });
        }
        
        // Add the character
        content += keystroke.key;
        currentPosition++;
        
        // Update the content for this phase
        if (timePhase === 'before') {
          beforeContent = content;
        } else if (timePhase === 'during') {
          duringContent = content;
        }
      } 
      else if (keystroke.type === 'delete') {
        if (content.length > 0) {
          // Track the deletion
          if (timePhase === 'during') {
            changes.push({
              timestamp: keystroke.timestamp,
              position: currentPosition - 1,
              text: content[content.length - 1],
              isDelete: true,
              length: 1
            });
          }
          
          // Remove the last character
          content = content.slice(0, -1);
          currentPosition--;
          
          // Update the content for this phase
          if (timePhase === 'before') {
            beforeContent = content;
          } else if (timePhase === 'during') {
            duringContent = content;
          }
        }
      }
    }
    
    return {
      before: beforeContent,
      during: duringContent,
      after: content,
      changes
    };
  }, []);
  
  // Effect to reconstruct essay when time range changes
  useEffect(() => {
    if (submissionQuery.data && selectedKeystrokeRange) {
      const reconstructed = reconstructEssayAtTimePoints(
        submissionQuery.data.keystrokes as any[], 
        selectedKeystrokeRange.keystrokes
      );
      
      setEssayAtTime(reconstructed);
    }
  }, [selectedKeystrokeRange, submissionQuery.data, reconstructEssayAtTimePoints]);

  // Add AI analysis hook
  const { analysis, setAnalysis, loading: aiLoading, error: aiError, analyzeSubmission } = useAIAnalysis(submissionId || "");

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


  
  // Function to render changes with highlighting
  const renderEssayWithHighlights = () => {
    if (!essayAtTime || !selectedKeystrokeRange) return (
      <div className="mt-4">
        <div className="bg-white rounded-md border p-4 min-h-[200px] whitespace-pre-wrap">
          {submission?.content || ""}
        </div>
      </div>
    );

    // Create an array marking the positions that need highlighting
    const highlightedPositions: boolean[] = [];
    
    if (essayAtTime.during) {
      // Initialize all positions as not highlighted
      highlightedPositions.length = essayAtTime.during.length;
      highlightedPositions.fill(false);
      
      // Mark positions that were changed during the selected time period
      essayAtTime.changes.forEach(change => {
        if (!change.isDelete) {
          // For additions, mark the position where text was added
          highlightedPositions[change.position] = true;
        }
      });
    }
    
    // Calculate the progress percentage of the selected timestamp within the overall timeline
    const calculateProgress = () => {
      if (!keystrokes || keystrokes.length === 0) return 0;
      
      const firstTime = new Date(keystrokes[0].timestamp).getTime();
      const lastTime = new Date(keystrokes[keystrokes.length - 1].timestamp).getTime();
      const selectedTime = new Date(selectedKeystrokeRange.endTime).getTime();
      
      const totalDuration = lastTime - firstTime;
      if (totalDuration === 0) return 100;
      
      const progress = Math.min(100, Math.max(0, ((selectedTime - firstTime) / totalDuration) * 100));
      return Math.round(progress);
    };
    
    const progress = calculateProgress();

    return (
      <div className="mt-4 space-y-6">
        {/* First, show a snapshot of the essay at the selected time */}
        <div>
          <h3 className="text-lg font-semibold mb-2 flex justify-between items-center">
            <div className="flex items-center">
              <span className="mr-2">📸</span>
              Essay Snapshot at {new Date(selectedKeystrokeRange.endTime).toLocaleTimeString()}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>{progress}% through writing process</span>
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </h3>
          <div className="bg-slate-50 rounded-md border border-amber-500 p-4 min-h-[200px] whitespace-pre-wrap">
            {essayAtTime.during}
          </div>
          <div className="mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setViewMode('full');
                setSelectedKeystrokeRange(null);
                setEssayAtTime(null);
              }}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to full essay
            </Button>
          </div>
        </div>
        
        {/* Show the detailed breakdown if not viewing a single point */}
        {selectedKeystrokeRange.startTime !== selectedKeystrokeRange.endTime && (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-2">Content Before Selected Time Range</h3>
              <div className="bg-white rounded-md border p-4 min-h-[200px] whitespace-pre-wrap">
                {essayAtTime.before}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Changes During Selected Time Range</h3>
              <div className="bg-white rounded-md border p-4 min-h-[200px] whitespace-pre-wrap">
                {essayAtTime.during.split('').map((char, i) => (
                  <span 
                    key={i} 
                    className={highlightedPositions[i] ? 'bg-yellow-200' : ''}
                  >
                    {char}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Final Content</h3>
              <div className="bg-white rounded-md border p-4 min-h-[200px] whitespace-pre-wrap">
                {submission?.content || ""}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* AI Analysis Card - Only for Teachers */}
      {user?.isTeacher && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!analysis && !aiLoading && (
              <div className="flex items-center gap-4">
                <Button onClick={() => analyzeSubmission()} className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Analyze Writing Quality & Plagiarism
                </Button>
                <p className="text-sm text-muted-foreground">
                  Click to analyze keystroke patterns for writing quality and plagiarism detection
                </p>
              </div>
            )}
            
            {aiLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Analyzing submission... This may take a few moments.
              </div>
            )}
            
            {aiError && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                Error: {aiError}
              </div>
            )}
            
            {analysis && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold">Writing Quality</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Score:</span>
                      <span className={`text-lg font-bold ${
                        analysis.writingQuality.qualityScore >= 4.5 ? 'text-green-600' :
                        analysis.writingQuality.qualityScore >= 3.5 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {analysis.writingQuality.qualityScore.toFixed(1)}/6.0
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Confidence:</span>
                      <span className="text-sm">{(analysis.writingQuality.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold">Plagiarism Risk</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Risk Level:</span>
                      <span className={`text-lg font-bold ${
                        analysis.plagiarism.plagiarismProbability < 20 ? 'text-green-600' :
                        analysis.plagiarism.plagiarismProbability < 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {analysis.plagiarism.plagiarismProbability.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Confidence:</span>
                      <span className="text-sm">{(analysis.plagiarism.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {analysis && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Analyzed {analysis.metadata.keystrokeCount} keystrokes</span>
                    <span>•</span>
                    <span>Analyzed at {new Date(analysis.metadata.analyzedAt).toLocaleString()}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      {analysis.metadata.cached ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Cached result
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Fresh analysis
                        </>
                      )}
                    </span>
                  </div>
                  {analysis.metadata.cached && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Force fresh analysis by clearing cache and re-analyzing
                        setAnalysis(null);
                        analyzeSubmission(true);
                      }}
                      className="text-xs"
                    >
                      Re-analyze
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Existing submission content */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            {user?.isTeacher && viewMode === 'timeSelection' ? (
              renderEssayWithHighlights()
            ) : (
              <>
                <h3>Essay Content</h3>
                <div className="bg-secondary/10 p-6 rounded-md whitespace-pre-wrap font-mono text-base text-foreground">
                  {user?.isTeacher ? renderTeacherContent(submission) : submission.content}
                </div>
              </>
            )}

            {user?.isTeacher && submission.quotes && submission.quotes.length > 0 && viewMode === 'full' && (
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
                {viewMode === 'full' && (
                  <>

                  </>
                )}

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

                  <KeystrokeGraph 
                    keystrokes={keystrokes} 
                    onTimeRangeSelected={handleTimeRangeSelected}
                  />
                  
                  {selectedKeystrokeRange && (
                    <div className="bg-muted p-4 rounded-md">
                      <p className="font-medium mb-2">Selected Time Range Activity</p>
                      <p>
                        <span className="text-muted-foreground">Time: </span>
                        {selectedKeystrokeRange.startTime} - {selectedKeystrokeRange.endTime}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Keystrokes: </span>
                        {selectedKeystrokeRange.keystrokes.length}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Characters added: </span>
                        {selectedKeystrokeRange.keystrokes.filter(k => k.type === 'input').length}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Deletions: </span>
                        {selectedKeystrokeRange.keystrokes.filter(k => k.type === 'delete').length}
                      </p>
                    </div>
                  )}
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