import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Clock, AlertTriangle, CheckCircle, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Question {
  id: string;
  question: string;
  questionNumber: number;
}

interface SessionQuestionPopupProps {
  questions: Question[];
  isVisible: boolean;
  onComplete: (answers: any[]) => void;
  onClose: () => void;
}

export function SessionQuestionPopup({ questions, isVisible, onComplete, onClose }: SessionQuestionPopupProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionTimings, setQuestionTimings] = useState<Record<string, { startTime: Date; timeToAnswer?: number; timedOut?: boolean }>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<NodeJS.Timeout>();
  
  // Copy/paste prevention - internal clipboard tracking
  const internalClipboardRef = useRef<string | null>(null);

  // Reset state when popup becomes visible with new questions
  useEffect(() => {
    if (isVisible && questions && questions.length > 0) {
      console.log('🔄 Resetting popup state for new questions');
      setCurrentQuestionIndex(0);
      setAnswers({});
      setQuestionTimings({});
      setIsCompleted(false); // Always reset completion state for new questions
      setTimeLeft(15);
    }
  }, [isVisible, questions]);

  // Start timer for current question
  useEffect(() => {
    if (!isVisible || isCompleted || !questions || questions.length === 0 || !questions[currentQuestionIndex]) return;

    const currentQuestion = questions[currentQuestionIndex];
    console.log(`⏰ Starting timer for question ${currentQuestionIndex + 1}: ${currentQuestion.question.substring(0, 50)}...`);

    // Record start time for this question if not already recorded
    if (!questionTimings[currentQuestion.id]) {
      const startTime = new Date();
      setQuestionTimings(prev => ({
        ...prev,
        [currentQuestion.id]: { startTime }
      }));
      console.log(`📝 Recording start time for question ${currentQuestion.id}`);
    }

    // Reset timer to 15 seconds
    setTimeLeft(15);

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          console.log(`⏰ Time's up for question ${currentQuestionIndex + 1}!`);
          // Don't call handleTimeOut here to avoid closure issues
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentQuestionIndex, isVisible, isCompleted, questions, questionTimings]);

  // Handle time expiration
  useEffect(() => {
    if (timeLeft === 0 && !isCompleted && isVisible && questions && questions.length > 0) {
      handleTimeOut();
    }
  }, [timeLeft, isCompleted, isVisible, questions]);

  const handleTimeOut = useCallback(() => {
    if (!questions || questions.length === 0) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    console.log(`⏰ Processing timeout for question ${currentQuestionIndex + 1}`);

    // Calculate time spent on this question
    const timing = questionTimings[currentQuestion.id];
    const timeToAnswer = timing ? (Date.now() - timing.startTime.getTime()) / 1000 : 15;

    // Update timing info
    setQuestionTimings(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        timeToAnswer,
        timedOut: true
      }
    }));

    // Move to next question or complete
    if (currentQuestionIndex < questions.length - 1) {
      console.log(`➡️ Moving to question ${currentQuestionIndex + 2}`);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      console.log('🏁 All questions completed (via timeout)');
      handleSubmitAll();
    }
  }, [currentQuestionIndex, questions, questionTimings]);

  const handleAnswerChange = useCallback((answer: string) => {
    if (!questions || questions.length === 0) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
  }, [currentQuestionIndex, questions]);

  const goToNextQuestion = useCallback(() => {
    if (!questions || questions.length === 0 || currentQuestionIndex >= questions.length - 1) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const timing = questionTimings[currentQuestion.id];
    const timeToAnswer = timing ? (Date.now() - timing.startTime.getTime()) / 1000 : 15 - timeLeft;
    const currentAnswer = answers[currentQuestion.id] || '';

    console.log(`➡️ MANUAL NEXT: question ${currentQuestionIndex + 1} → ${currentQuestionIndex + 2}`);
    console.log(`📊 Question ${currentQuestionIndex + 1} completion details:`, {
      questionId: currentQuestion.id,
      hasAnswer: !!currentAnswer.trim(),
      answerLength: currentAnswer.length,
      timeToAnswer,
      existingTiming: timing,
      timeLeft,
      nextQuestionIndex: currentQuestionIndex + 1,
      totalQuestions: questions.length
    });

    // Update timing info for completed question
    setQuestionTimings(prev => {
      const updated = {
        ...prev,
        [currentQuestion.id]: {
          ...prev[currentQuestion.id],
          timeToAnswer,
          timedOut: false
        }
      };
      console.log(`⏱️ Updated timing for question ${currentQuestionIndex + 1}:`, updated[currentQuestion.id]);
      return updated;
    });

    const newIndex = currentQuestionIndex + 1;
    console.log(`🎯 Setting question index to: ${newIndex}`);
    setCurrentQuestionIndex(newIndex);
    
    // Log state after navigation
    setTimeout(() => {
      console.log(`✅ Navigation complete. New state:`, {
        currentQuestionIndex: newIndex,
        questionCount: questions.length,
        isLastQuestion: newIndex === questions.length - 1,
        willShowSubmitButton: newIndex === questions.length - 1
      });
    }, 100);
  }, [currentQuestionIndex, questions, questionTimings, timeLeft, answers]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      console.log(`⬅️ Going back: question ${currentQuestionIndex + 1} → ${currentQuestionIndex}`);
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  const handleSubmitAll = useCallback(() => {
    if (!questions || questions.length === 0) {
      console.log('⚠️ No questions to submit, closing popup');
      onClose();
      return;
    }
    
    console.log('📤 SUBMITTING ALL ANSWERS - called from:', new Error().stack?.split('\n')[2]?.trim());
    console.log('📊 Submit state analysis:', {
      currentQuestionIndex: currentQuestionIndex + 1,
      totalQuestions: questions.length,
      answeredQuestions: Object.values(answers).filter(a => a?.trim()).length,
      questionsWithTiming: Object.keys(questionTimings).length,
      isCompleted,
      answers: Object.keys(answers).map(qId => ({
        questionId: qId,
        hasAnswer: !!answers[qId]?.trim(),
        answerLength: answers[qId]?.length || 0
      })),
      timingDetails: Object.entries(questionTimings).map(([qId, timing]) => ({
        questionId: qId,
        timedOut: timing.timedOut,
        timeToAnswer: timing.timeToAnswer,
        hasTimeToAnswer: timing.timeToAnswer !== undefined
      }))
    });
    
    // Convert answers to the expected format
    const formattedAnswers = questions.map(question => {
      const timing = questionTimings[question.id];
      
      return {
        questionId: question.id,
        answer: answers[question.id] || '',
        timeToAnswer: timing?.timeToAnswer || 0,
        timedOut: timing?.timedOut || false
      };
    });

    console.log('📊 Formatted answers for submission:', formattedAnswers);

    setIsCompleted(true);
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Submit to database
    setTimeout(() => {
      onComplete(formattedAnswers);
    }, 500);
  }, [answers, questions, questionTimings, onComplete, onClose, currentQuestionIndex, isCompleted]);

  // Auto-submit when all questions have been properly completed (answered or timed out)
  useEffect(() => {
    if (!questions || questions.length === 0) return;
    
    // Check if all questions have been completed (either answered and moved past, or timed out)
    const allQuestionsCompleted = questions.every(question => {
      const timing = questionTimings[question.id];
      // A question is completed if it has timing data AND either:
      // 1. It was timed out, OR
      // 2. It has an answer and we've moved past it (timeToAnswer exists)
      return timing && (timing.timedOut || (timing.timeToAnswer !== undefined && answers[question.id]?.trim()));
    });
    
    // Only auto-submit if we're past the last question or all questions are truly completed
    const isPastLastQuestion = currentQuestionIndex >= questions.length;
    
    if ((allQuestionsCompleted || isPastLastQuestion) && !isCompleted) {
      console.log('🏁 All questions properly completed, auto-submitting...', { 
        allQuestionsCompleted, 
        isPastLastQuestion,
        completedTimings: Object.keys(questionTimings).length,
        totalQuestions: questions.length
      });
      handleSubmitAll();
    }
  }, [questionTimings, questions, isCompleted, handleSubmitAll, currentQuestionIndex, answers]);

  // Additional safety check - if questions become empty while visible, close immediately
  useEffect(() => {
    if (isVisible && (!questions || questions.length === 0)) {
      console.log('⚠️ Questions became empty while popup visible, closing');
      onClose();
    }
  }, [isVisible, questions, onClose]);

  // Copy/paste handlers for security
  const handleCopy = useCallback((e: React.ClipboardEvent) => {
    const selectedText = window.getSelection()?.toString() || '';
    if (selectedText) {
      internalClipboardRef.current = selectedText;
      console.log('📋 Internal copy allowed:', selectedText.substring(0, 20) + '...');
    }
  }, []);

  const handleCut = useCallback((e: React.ClipboardEvent) => {
    const selectedText = window.getSelection()?.toString() || '';
    if (selectedText) {
      internalClipboardRef.current = selectedText;
      console.log('✂️ Internal cut allowed:', selectedText.substring(0, 20) + '...');
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Only allow paste if it matches our internal clipboard (copied from this same textarea)
    if (pastedText === internalClipboardRef.current) {
      console.log('📋 Internal paste allowed');
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const currentValue = target.value;
      
      const newValue = currentValue.substring(0, start) + pastedText + currentValue.substring(end);
      handleAnswerChange(newValue);
      
      // Reset cursor position
      setTimeout(() => {
        target.setSelectionRange(start + pastedText.length, start + pastedText.length);
      }, 0);
    } else {
      console.log('🚫 External paste blocked');
    }
  }, [handleAnswerChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log('🚫 Drop operation blocked');
  }, []);

  const getTimerColor = () => {
    if (timeLeft > 10) return 'text-green-600 bg-green-50 border-green-200';
    if (timeLeft > 5) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // Early return after all hooks are called
  if (!isVisible || !questions || questions.length === 0) {
    return null;
  }

  // Get current question safely
  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    console.log('⚠️ No current question available, closing popup');
    onClose();
    return null;
  }

  const currentAnswer = answers[currentQuestion.id] || '';
  const answeredQuestions = Object.values(answers).filter(answer => answer.trim()).length;

  // Debug logging
  console.log('🎭 Question Form State:', { 
    isVisible, 
    questionsLength: questions.length, 
    currentQuestionIndex: currentQuestionIndex + 1,
    currentQuestion: currentQuestion?.question?.substring(0, 30) + '...',
    answeredQuestions,
    timeLeft,
    completedTimings: Object.keys(questionTimings).length
  });

  return (
    <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl mx-auto shadow-2xl border-2 border-primary bg-white">
        <CardHeader className="bg-blue-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl text-blue-800">
              <AlertCircle className="w-6 h-6" />
              Writing Progress Questions
            </CardTitle>
            <div className="flex items-center gap-4">
              {/* Timer Display */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold border-2 ${getTimerColor()}`}>
                <Clock className="w-5 h-5" />
                <span>{timeLeft}s</span>
                {timeLeft <= 5 && <AlertTriangle className="w-4 h-4 animate-pulse" />}
              </div>
              <Button 
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{answeredQuestions} / {questions.length} answered</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          {!isCompleted ? (
            <>
              {/* Question Display */}
              <div className="mb-8">
                <div className="bg-gray-50 p-6 rounded-lg mb-6 border-l-4 border-blue-500">
                  <h3 className="text-2xl font-semibold text-gray-800 leading-relaxed">
                    {currentQuestion.question}
                  </h3>
                </div>
                
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  onCopy={handleCopy}
                  onCut={handleCut}
                  onPaste={handlePaste}
                  onDrop={handleDrop}
                  placeholder={`Type your answer here... (${timeLeft}s remaining)`}
                  className="min-h-[200px] text-lg resize-none border-2 focus:border-blue-500"
                  autoFocus
                />
                <div className="mt-2 text-sm text-gray-500">
                  ⚠️ Copy/paste from external sources is disabled. Each question has a 15-second timer.
                </div>
              </div>

              {/* Navigation and Action Buttons */}
              <div className="flex justify-between items-center">
                <Button
                  onClick={goToPreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex gap-3">
                  {currentQuestionIndex < questions.length - 1 ? (
                    <Button
                      onClick={goToNextQuestion}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      Next Question
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitAll}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Submit All Answers
                    </Button>
                  )}
                </div>
              </div>

              {/* Question indicators */}
              <div className="mt-6 flex justify-center gap-2">
                {questions.map((_, index) => {
                  const questionId = questions[index].id;
                  const hasAnswer = answers[questionId]?.trim();
                  const hasTiming = questionTimings[questionId];
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === currentQuestionIndex 
                          ? 'bg-blue-600 scale-125' 
                          : hasTiming
                            ? (hasAnswer ? 'bg-green-500' : 'bg-orange-500')
                            : 'bg-gray-300'
                      }`}
                      title={`Question ${index + 1}${hasAnswer ? ' (answered)' : hasTiming ? ' (completed)' : ''}`}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold mb-4 text-green-800">All Questions Completed!</h3>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Thank you for taking the time to answer these questions. Your responses have been saved to the database.
              </p>
              <Button 
                onClick={onClose} 
                className="text-lg px-8 py-4 bg-green-600 hover:bg-green-700"
              >
                Continue Writing
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 