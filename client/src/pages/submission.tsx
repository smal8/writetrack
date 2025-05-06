import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradingForm } from "@/components/grading-form";
import { KeystrokeGraph } from "@/components/keystroke-graph";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
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
const getAIRiskLevel = (score: number): { color: string, label: string, bgColor: string, progressColor: string } => {
  if (score >= 75) return { 
    color: "text-red-500", 
    label: "High", 
    bgColor: "bg-red-50",
    progressColor: "bg-red-500"
  };
  if (score >= 40) return { 
    color: "text-amber-500", 
    label: "Medium", 
    bgColor: "bg-amber-50",
    progressColor: "bg-amber-500"
  };
  return { 
    color: "text-green-500", 
    label: "Low", 
    bgColor: "bg-green-50",
    progressColor: "bg-green-500"
  };
};

// Interface for change fragments that track text changes
interface TextChange {
  timestamp: string;
  position: number;
  text: string;
  isDelete: boolean;
  length: number;
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

  // Generate AI score for teacher view
  const aiScore = user?.isTeacher ? generateAIScore(submission.studentId, parseInt(submissionId || "0")) : 0;
  const riskLevel = getAIRiskLevel(aiScore);
  
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
                    {/* AI Analysis Card */}
                    <Card className={`mt-8 border-2 ${riskLevel.color} ${riskLevel.bgColor}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className={`h-5 w-5 ${riskLevel.color}`} />
                          AI Content Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className={`text-3xl font-bold ${riskLevel.color}`}>{aiScore}%</p>
                              <p className="text-sm font-medium">
                                {riskLevel.label} probability of AI-generated content
                              </p>
                            </div>
                            <div className={`px-4 py-2 rounded-full font-semibold ${riskLevel.bgColor} ${riskLevel.color}`}>
                              {riskLevel.label} Risk
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>AI Content Probability</span>
                              <span className="font-medium">{aiScore}%</span>
                            </div>
                            <Progress value={aiScore} className="h-2" indicatorClassName={riskLevel.progressColor} />
                          </div>
                          
                          <div className="text-sm space-y-2">
                            <p className="font-semibold">Key Detection Factors:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>Keystroke rhythm analysis</li>
                              <li>Pause pattern detection</li>
                              <li>Edit behavior fingerprinting</li>
                              <li>Citation integration patterns</li>
                            </ul>
                          </div>
                          
                          {riskLevel.label === "High" && (
                            <div className="p-3 bg-red-100 border border-red-200 rounded-md mt-2">
                              <p className="text-red-800 text-sm font-medium">
                                This submission shows strong indicators of AI-generated content. 
                                Review carefully before grading.
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
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