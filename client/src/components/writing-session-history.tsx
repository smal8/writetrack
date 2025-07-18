import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Clock, MessageSquare, ChevronDown, ChevronUp, FileText, Brain, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';

interface WritingSessionHistoryProps {
  submissionId: number;
}

interface SessionQuestion {
  id: number;
  questionNumber: number;
  question: string;
  answer: string | null;
  timeToAnswer: number | null;
  timedOut: boolean;
  contextContent: string;
  answeredAt: string | null;
  generatedAt: string;
}

interface WritingSession {
  id: number;
  sessionNumber: number;
  startTime: string;
  endTime: string | null;
  contentAtStart: string;
  contentAtEnd: string | null;
  questionsTriggered: boolean;
  questionsCompleted: boolean;
  questions: SessionQuestion[];
}

interface SessionHistoryData {
  submissionId: number;
  totalSessions: number;
  sessions: WritingSession[];
}

export function WritingSessionHistory({ submissionId }: WritingSessionHistoryProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const sessionsPerPage = 1;

  const { data, isLoading, error } = useQuery({
    queryKey: ['writing-session-history', submissionId],
    queryFn: async (): Promise<SessionHistoryData> => {
      const response = await apiRequest('GET', `/api/submissions/${submissionId}/sessions`);
      if (!response.ok) {
        throw new Error('Failed to fetch session history');
      }
      return response.json();
    }
  });

  const toggleSession = (sessionId: number) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  // Pagination helpers
  const totalPages = data ? Math.ceil(data.sessions.length / sessionsPerPage) : 0;
  const startIndex = currentPage * sessionsPerPage;
  const endIndex = startIndex + sessionsPerPage;
  const currentSessions = data?.sessions.slice(startIndex, endIndex) || [];

  const goToPreviousPage = () => {
    setCurrentPage(Math.max(0, currentPage - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(Math.min(totalPages - 1, currentPage + 1));
  };

  const getWordCount = (content: string) => {
    return content ? content.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
  };

  const getContentDiff = (previousContent: string, currentContent: string) => {
    if (!previousContent) return currentContent;
    
    if (currentContent.startsWith(previousContent)) {
      return currentContent.slice(previousContent.length).trim();
    }
    
    // Simple word-based diff for display
    const prevWords = previousContent.trim().split(/\s+/);
    const currWords = currentContent.trim().split(/\s+/);
    
    if (currWords.length > prevWords.length) {
      return currWords.slice(prevWords.length).join(' ');
    }
    
    return currentContent;
  };

  const formatTimeSpent = (seconds: number | null) => {
    if (!seconds) return 'No response';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading session history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>
          Failed to load session history. This feature tracks your writing progress at each 10-word benchmark.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.sessions.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No writing sessions found yet. Sessions are created every time you reach a 10-word benchmark and questions are triggered.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Found <strong>{data.totalSessions}</strong> writing sessions (10-word benchmarks)
          {totalPages > 1 && (
            <span className="ml-2">
              • Showing {startIndex + 1}-{Math.min(endIndex, data.sessions.length)} of {data.sessions.length}
            </span>
          )}
        </p>
        <div className="flex gap-2">
          {totalPages > 1 && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages - 1}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const currentSessionIds = currentSessions.map(s => s.id);
              setExpandedSessions(expandedSessions.size === 0 ? new Set(currentSessionIds) : new Set());
            }}
          >
            {expandedSessions.size === 0 ? 'Expand All' : 'Collapse All'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {currentSessions.map((session, index) => {
          const isExpanded = expandedSessions.has(session.id);
          const globalIndex = startIndex + index;
          const previousSession = globalIndex > 0 ? data.sessions[globalIndex - 1] : null;
          const newContent = getContentDiff(previousSession?.contentAtEnd || '', session.contentAtStart);
          const startWordCount = getWordCount(session.contentAtStart);
          const endWordCount = getWordCount(session.contentAtEnd || session.contentAtStart);

          return (
            <Card key={session.id} className="border-l-4 border-blue-500">
              <Collapsible open={isExpanded} onOpenChange={() => toggleSession(session.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-sm">
                          Session {session.sessionNumber}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {new Date(session.startTime).toLocaleString()}
                        </div>

                        {session.questionsCompleted ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : session.questionsTriggered ? (
                          <XCircle className="w-4 h-4 text-orange-600" />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextSessionIndex = currentSessions.findIndex(s => s.id === session.id) + 1;
                            if (nextSessionIndex < currentSessions.length) {
                              const nextSessionId = currentSessions[nextSessionIndex].id;
                              setExpandedSessions(new Set([nextSessionId]));
                            } else if (currentPage < totalPages - 1) {
                              goToNextPage();
                              setExpandedSessions(new Set([currentSessions[0]?.id]));
                            }
                          }}
                          disabled={
                            currentSessions.findIndex(s => s.id === session.id) === currentSessions.length - 1 && 
                            currentPage === totalPages - 1
                          }
                        >
                          Next
                        </Button>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {/* Content at start of session */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Content at Session Start ({startWordCount} words)
                        </h4>
                        <div className="bg-gray-50 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                          {session.contentAtStart || 'No content'}
                        </div>
                      </div>

                      {/* New content written in this session */}
                      {newContent && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Brain className="w-4 h-4 text-green-600" />
                            New Content Written in This Session
                          </h4>
                          <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded-md text-sm">
                            {newContent}
                          </div>
                        </div>
                      )}

                      {/* Questions asked in this session */}
                      {session.questions.length > 0 && (
                        <TeacherSessionQuestions questions={session.questions} sessionNumber={session.sessionNumber} />
                      )}

                      {/* Content at end of session */}
                      {session.contentAtEnd && session.contentAtEnd !== session.contentAtStart && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Content at Session End ({endWordCount} words)
                          </h4>
                          <div className="bg-gray-50 p-3 rounded-md text-sm max-h-32 overflow-y-auto">
                            {session.contentAtEnd}
                          </div>
                        </div>
                      )}

                      <Separator />
                      
                      {/* Session metadata */}
                      <div className="text-xs text-gray-500 grid grid-cols-2 gap-4">
                        <div>
                          <strong>Started:</strong> {new Date(session.startTime).toLocaleString()}
                        </div>
                        <div>
                          <strong>Ended:</strong> {session.endTime ? new Date(session.endTime).toLocaleString() : 'In progress'}
                        </div>
                        <div>
                          <strong>Questions Triggered:</strong> {session.questionsTriggered ? 'Yes' : 'No'}
                        </div>
                        <div>
                          <strong>Questions Completed:</strong> {session.questionsCompleted ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      
    </div>
  );
}

// Teacher Session Questions Component (similar to student view)
interface TeacherSessionQuestionsProps {
  questions: SessionQuestion[];
  sessionNumber: number;
}

function TeacherSessionQuestions({ questions, sessionNumber }: TeacherSessionQuestionsProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  if (!questions || questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredQuestions = questions.filter(q => q.answer && q.answer.trim()).length;
  const timedOutQuestions = questions.filter(q => q.timedOut).length;

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "N/A";
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const goToPreviousQuestion = () => {
    setCurrentQuestionIndex(prev => prev > 0 ? prev - 1 : questions.length - 1);
  };

  const goToNextQuestion = () => {
    setCurrentQuestionIndex(prev => prev < questions.length - 1 ? prev + 1 : 0);
  };

  return (
    <div className="mt-4">
      <h4 className="font-medium mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-purple-600" />
        Session {sessionNumber} Questions ({questions.length} total)
      </h4>
      
      <Card className="bg-purple-50 border-purple-200">
        <CardHeader className="pb-3">
          <div className="flex gap-4 text-sm">
            <Badge variant="outline" className="bg-white">
              {questions.length} Total Questions
            </Badge>
            <Badge variant="outline" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              {answeredQuestions} Answered
            </Badge>
            {timedOutQuestions > 0 && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800">
                <XCircle className="w-3 h-3 mr-1" />
                {timedOutQuestions} Timed Out
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Question Navigation */}
          <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousQuestion}
              disabled={questions.length <= 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <div className="flex gap-1">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentQuestionIndex ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextQuestion}
              disabled={questions.length <= 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Current Question Display */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <Badge variant="outline" className="bg-white">
                Question {currentQuestion.questionNumber}
              </Badge>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {currentQuestion.timedOut ? (
                  <span className="text-orange-600 font-medium">Timed out</span>
                ) : (
                  <span>{formatTime(currentQuestion.timeToAnswer)}</span>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-sm mb-2 text-gray-700">Question:</p>
                <p className="text-sm text-gray-800 leading-relaxed">{currentQuestion.question}</p>
              </div>
              
              <div>
                <p className="font-semibold text-sm mb-2 text-gray-700">Student Answer:</p>
                {currentQuestion.answer && currentQuestion.answer.trim() ? (
                  <div className="bg-white p-3 rounded border-l-4 border-l-green-400">
                    <p className="text-sm text-gray-800 italic leading-relaxed">
                      "{currentQuestion.answer}"
                    </p>
                  </div>
                ) : currentQuestion.timedOut ? (
                  <div className="bg-orange-50 p-3 rounded border-l-4 border-l-orange-400">
                    <p className="text-sm text-orange-700 italic font-medium">
                      No answer provided (timed out)
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-100 p-3 rounded border-l-4 border-l-gray-400">
                    <p className="text-sm text-gray-600 italic">
                      No answer provided
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 