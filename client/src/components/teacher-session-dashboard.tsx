import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, ChevronDown, ChevronRight, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SessionQuestion {
  id: number;
  sessionId: number;
  questionNumber: number;
  question: string;
  generatedAt: string;
  askedAt?: string;
  answeredAt?: string;
  answer?: string;
  timeToAnswer?: number;
  timedOut: boolean;
  contextContent: string;
}

interface WritingSession {
  id: number;
  submissionId: number;
  studentId: number;
  sessionNumber: number;
  startTime: string;
  endTime?: string;
  sessionDuration?: number;
  contentAtStart: string;
  contentAtEnd?: string;
  questionsTriggered: boolean;
  questionsCompleted: boolean;
  questions?: SessionQuestion[];
}

interface TeacherSessionDashboardProps {
  submissionId: number;
}

export function TeacherSessionDashboard({ submissionId }: TeacherSessionDashboardProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  const { data: sessionsData, isLoading } = useQuery({
          queryKey: [`/api/submissions/${submissionId}/sessions`],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/submissions/${submissionId}/sessions`);
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      return response.json();
    }
  });

  const sessions: WritingSession[] = sessionsData?.sessions || [];

  const toggleSession = (sessionId: number) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const calculateContentDiff = (startContent: string, endContent?: string) => {
    if (!endContent) return { added: 0, removed: 0 };
    
    const startWords = startContent.split(/\s+/).length;
    const endWords = endContent.split(/\s+/).length;
    
    return {
      added: Math.max(0, endWords - startWords),
      removed: Math.max(0, startWords - endWords)
    };
  };

  const renderContentComparison = (session: WritingSession) => {
    const diff = calculateContentDiff(session.contentAtStart, session.contentAtEnd);
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Content at Start</h4>
            <div className="bg-muted/50 p-3 rounded-md max-h-32 overflow-y-auto text-sm">
              {session.contentAtStart || 'No content'}
            </div>
          </div>
          {session.contentAtEnd && (
            <div>
              <h4 className="font-semibold mb-2">Content at End</h4>
              <div className="bg-muted/50 p-3 rounded-md max-h-32 overflow-y-auto text-sm">
                {session.contentAtEnd}
              </div>
            </div>
          )}
        </div>
        
        {session.contentAtEnd && (
          <div className="flex gap-4 text-sm">
            <Badge variant="outline" className="text-green-600">
              +{diff.added} words added
            </Badge>
            {diff.removed > 0 && (
              <Badge variant="outline" className="text-red-600">
                -{diff.removed} words removed
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Writing Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No writing sessions recorded for this submission.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Writing Sessions ({sessions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.map((session) => (
          <Card key={session.id} className="border-l-4 border-l-primary/30">
            <Collapsible
              open={expandedSessions.has(session.id)}
              onOpenChange={() => toggleSession(session.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedSessions.has(session.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <div>
                        <CardTitle className="text-base">
                          Session #{session.sessionNumber}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Started: {new Date(session.startTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={session.questionsCompleted ? "default" : "secondary"}>
                        {session.questionsCompleted ? "Completed" : session.questionsTriggered ? "In Progress" : "Active"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDuration(session.sessionDuration)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-6">
                    {/* Content Comparison */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Content Changes
                      </h3>
                      {renderContentComparison(session)}
                    </div>

                    {/* Session Questions */}
                    {session.questions && session.questions.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Session Questions</h3>
                        <div className="space-y-3">
                          {session.questions.map((question) => (
                            <Card key={question.id} className="bg-muted/20">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-medium">
                                    Question {question.questionNumber}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    {question.timedOut ? (
                                      <AlertCircle className="w-4 h-4 text-orange-500" />
                                    ) : question.answer ? (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : null}
                                    {question.timeToAnswer && (
                                      <Badge variant="outline" className="text-xs">
                                        {question.timeToAnswer}s
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <p className="text-sm mb-3 font-medium">
                                  {question.question}
                                </p>
                                
                                {question.answer ? (
                                  <div className="bg-background/50 p-3 rounded-md">
                                    <p className="text-sm">
                                      <strong>Answer:</strong> {question.answer}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">
                                    {question.timedOut ? 'Timed out - no answer provided' : 'Not answered yet'}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
} 