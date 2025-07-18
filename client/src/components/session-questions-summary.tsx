import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Clock, MessageSquare, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SessionQuestion {
  id: number;
  questionNumber: number;
  question: string;
  answer: string | null;
  timeToAnswer: number | null;
  timedOut: boolean;
  answeredAt: string | null;
  generatedAt: string;
}

interface WritingSession {
  id: number;
  sessionNumber: number;
  startTime: string;
  questionsTriggered: boolean;
  questionsCompleted: boolean;
  questions: SessionQuestion[];
}

interface SessionQuestionsSummaryProps {
  submissionId: number;
}

export function SessionQuestionsSummary({ submissionId }: SessionQuestionsSummaryProps) {
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  
  const sessionsQuery = useQuery({
    queryKey: [`/api/submissions/${submissionId}/sessions`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/submissions/${submissionId}/sessions`);
      if (!response.ok) {
        throw new Error('Failed to fetch session data');
      }
      return response.json();
    },
    enabled: !!submissionId,
  });

  if (sessionsQuery.isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Your Writing Session Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading your questions and answers...</p>
        </CardContent>
      </Card>
    );
  }

  if (sessionsQuery.error || !sessionsQuery.data) {
    return null; // Don't show the component if there's an error or no data
  }

  const { sessions }: { sessions: WritingSession[] } = sessionsQuery.data;
  const sessionsWithQuestions = sessions.filter(session => session.questions.length > 0);

  if (sessionsWithQuestions.length === 0) {
    return null; // Don't show the component if no questions were asked
  }

  // Reset current session index if it's out of bounds
  if (currentSessionIndex >= sessionsWithQuestions.length) {
    setCurrentSessionIndex(0);
  }

  const currentSession = sessionsWithQuestions[currentSessionIndex];
  const totalQuestions = sessionsWithQuestions.reduce((sum, session) => sum + session.questions.length, 0);
  const answeredQuestions = sessionsWithQuestions.reduce((sum, session) => 
    sum + session.questions.filter(q => q.answer && q.answer.trim()).length, 0);
  const timedOutQuestions = sessionsWithQuestions.reduce((sum, session) => 
    sum + session.questions.filter(q => q.timedOut).length, 0);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "N/A";
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const goToPreviousSession = () => {
    setCurrentSessionIndex(prev => prev > 0 ? prev - 1 : sessionsWithQuestions.length - 1);
  };

  const goToNextSession = () => {
    setCurrentSessionIndex(prev => prev < sessionsWithQuestions.length - 1 ? prev + 1 : 0);
  };

  return (
    <Card className="mb-6 bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Your Writing Session Questions
        </CardTitle>
        <div className="flex gap-4 text-sm">
          <Badge variant="outline" className="bg-white">
            {totalQuestions} Total Questions
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {answeredQuestions} Answered
          </Badge>
          {timedOutQuestions > 0 && (
            <Badge variant="outline" className="bg-orange-100 text-orange-800">
              <AlertCircle className="w-3 h-3 mr-1" />
              {timedOutQuestions} Timed Out
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Session Navigation */}
        <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousSession}
            disabled={sessionsWithQuestions.length <= 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              Session {currentSessionIndex + 1} of {sessionsWithQuestions.length}
            </span>
            <div className="flex gap-1">
              {sessionsWithQuestions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSessionIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSessionIndex ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextSession}
            disabled={sessionsWithQuestions.length <= 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Current Session Display */}
        <ScrollArea className="h-96">
          <Card className="bg-white border-l-4 border-l-blue-400">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="bg-blue-600 text-white">
                    Writing Session {currentSession.sessionNumber}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {new Date(currentSession.startTime).toLocaleString()}
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {currentSession.questions.length} {currentSession.questions.length === 1 ? 'Question' : 'Questions'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                {currentSession.questions.map((question, questionIndex) => (
                  <div key={question.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="outline" className="bg-white">
                        Question {question.questionNumber}
                      </Badge>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {question.timedOut ? (
                          <span className="text-orange-600 font-medium">Timed out</span>
                        ) : (
                          <span>{formatTime(question.timeToAnswer)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="font-semibold text-sm mb-2 text-gray-700">Question:</p>
                        <p className="text-sm text-gray-800 leading-relaxed">{question.question}</p>
                      </div>
                      
                      <div>
                        <p className="font-semibold text-sm mb-2 text-gray-700">Your Answer:</p>
                        {question.answer && question.answer.trim() ? (
                          <div className="bg-white p-3 rounded border-l-4 border-l-green-400">
                            <p className="text-sm text-gray-800 italic leading-relaxed">
                              "{question.answer}"
                            </p>
                          </div>
                        ) : question.timedOut ? (
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
                ))}
              </div>
            </CardContent>
          </Card>
        </ScrollArea>
        
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Review Summary:</strong> You answered {answeredQuestions} out of {totalQuestions} questions 
            during your writing process. These questions helped guide your thinking and will be included 
            with your submission for your teacher's review.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 