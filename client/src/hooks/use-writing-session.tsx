import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Question {
  id: string;
  question: string;
  questionNumber: number;
}

interface UseWritingSessionProps {
  submissionId: number;
  assignmentTitle: string;
  content: string;
  keystrokes: any[];
  onQuestionsGenerated?: (questions: Question[]) => void;
  onSessionComplete?: () => void;
}

export function useWritingSession({
  submissionId,
  assignmentTitle,
  content,
  keystrokes,
  onQuestionsGenerated,
  onSessionComplete
}: UseWritingSessionProps) {
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [lastQuestionWordCount, setLastQuestionWordCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Track content snapshot when questions were last generated
  const lastQuestionContentRef = useRef('');
  const isInitializedRef = useRef(false);

  // Early return if submission ID is invalid - but still show word count
  if (!submissionId || submissionId === 0) {
    // Calculate word count even without valid submission ID
    const getCurrentWordCount = () => {
      if (!content) return 0;
      const words = content.trim().split(/\s+/).filter(word => word.length > 0);
      if (content.endsWith(' ') || /[.!?]$/.test(content.trim())) {
        return words.length;
      }
      return Math.max(0, words.length - 1);
    };

    const currentWordCount = getCurrentWordCount();
    
    return {
      currentWordCount,
      wordsUntilQuestions: currentWordCount < 10 ? 10 - currentWordCount : 10 - (currentWordCount % 10),
      showQuestions: false,
      questions: [],
      handleQuestionsComplete: () => {},
      handleQuestionsClose: () => {},
      isLoading: false,
      isBlocked: false
    };
  }

  // Simple word count - only count complete words (followed by space or at end)
  const getCurrentWordCount = useCallback(() => {
    if (!content) return 0;
    
    // Split by whitespace and filter out empty strings
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    
    // If content ends with space or punctuation, count all words
    // If not, the last word might be incomplete, so don't count it
    if (content.endsWith(' ') || /[.!?]$/.test(content.trim())) {
      return words.length;
    }
    
    // Don't count incomplete last word unless it's the only word
    return Math.max(0, words.length - 1);
  }, [content]);

  // Initialize on first load - even with empty content
  useEffect(() => {
    if (!isInitializedRef.current) {
      const wordCount = getCurrentWordCount();
      setLastQuestionWordCount(Math.floor(wordCount / 10) * 10);
      lastQuestionContentRef.current = content;
      isInitializedRef.current = true;
      
      console.log('✅ Writing session initialized:', {
        wordCount,
        lastQuestionWordCount: Math.floor(wordCount / 10) * 10,
        contentLength: content.length,
        isEmpty: !content
      });
    }
  }, [content, getCurrentWordCount]);

  // Generate questions mutation
  const generateQuestionsMutation = useMutation({
    mutationFn: async () => {
      const newContent = content.slice(lastQuestionContentRef.current.length);
      
      console.log('🎯 Generating questions:', {
        totalContentLength: content.length,
        lastQuestionContentLength: lastQuestionContentRef.current.length,
        newContentLength: newContent.length,
        newContentPreview: newContent.substring(0, 100) + '...'
      });
      
      const response = await apiRequest('POST', '/api/sessions/generate-questions', {
        content: newContent,
        fullContent: content,
        previousContent: lastQuestionContentRef.current,
        assignmentTitle,
        submissionId,
        isIncremental: lastQuestionContentRef.current.length > 0
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.questions && data.questions.length > 0) {
        // First call onQuestionsGenerated (which may include saving)
        if (onQuestionsGenerated) {
          try {
            await onQuestionsGenerated(data.questions);
            console.log('✅ Pre-question callback completed successfully');
          } catch (error) {
            console.error('❌ Pre-question callback failed:', error);
          }
        }
        
        // Then show the questions
        setQuestions(data.questions);
        setShowQuestions(true);
        
        console.log('✅ Questions generated and displayed:', data.questions.length);
      } else {
        console.log('⚠️ No questions generated');
      }
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error('❌ Failed to generate questions:', error);
      setIsGenerating(false);
    }
  });

  // Save questions and answers mutation
  const saveQuestionsMutation = useMutation({
    mutationFn: async (answers: any[]) => {
      if (!questions || questions.length === 0) {
        return Promise.resolve({ success: true });
      }
      
      console.log('💾 Saving questions and answers:', {
        questionsCount: questions.length,
        answersCount: answers.length,
        contentLength: content.length
      });
      
      const response = await apiRequest('POST', '/api/sessions/questions', {
        submissionId,
        questions,
        answers,
        contextContent: content,
        cumulativeTimeWhenShown: 0
      });
      
      if (!response.ok) {
        throw new Error('Failed to save questions');
      }
      return response.json();
    },
    onSuccess: () => {
      // Update our tracking after successful save
      lastQuestionContentRef.current = content;
      setLastQuestionWordCount(getCurrentWordCount());
      
      // Clean up UI state
      setShowQuestions(false);
      setQuestions([]);
      
      console.log('✅ Questions saved successfully, updated tracking:', {
        newLastQuestionWordCount: getCurrentWordCount(),
        newContentSnapshotLength: content.length
      });
      
      onSessionComplete?.();
    },
    onError: (error) => {
      console.error('❌ Failed to save questions:', error);
      // Clean up UI state even on error
      setShowQuestions(false);
      setQuestions([]);
    }
  });

  // Main trigger logic - much simpler now
  useEffect(() => {
    if (!isInitializedRef.current) return;
    
    const currentWordCount = getCurrentWordCount();
    const shouldTrigger = 
      currentWordCount >= 10 && 
      currentWordCount % 10 === 0 && 
      currentWordCount > lastQuestionWordCount &&
      !showQuestions && 
      !isGenerating &&
      content.length > lastQuestionContentRef.current.length; // Only if user added content

    console.log('🔍 Trigger check:', {
      currentWordCount,
      lastQuestionWordCount,
      shouldTrigger,
      contentLength: content.length,
      lastContentLength: lastQuestionContentRef.current.length,
      showQuestions,
      isGenerating,
      // Break down the conditions
      conditions: {
        hasEnoughWords: currentWordCount >= 10,
        isAtTenWordBoundary: currentWordCount % 10 === 0,
        isNewWordCount: currentWordCount > lastQuestionWordCount,
        notShowingQuestions: !showQuestions,
        notGenerating: !isGenerating,
        hasNewContent: content.length > lastQuestionContentRef.current.length
      }
    });

    if (shouldTrigger) {
      console.log('🔥 TRIGGERING QUESTIONS at', currentWordCount, 'words');
      setIsGenerating(true);
      setLastQuestionWordCount(currentWordCount);
      generateQuestionsMutation.mutate();
    }
  }, [content, lastQuestionWordCount, showQuestions, isGenerating, getCurrentWordCount, generateQuestionsMutation]);

  // Handler functions
  const handleQuestionsComplete = useCallback((answers: any[]) => {
    if (questions && questions.length > 0) {
      saveQuestionsMutation.mutate(answers);
    } else {
      setShowQuestions(false);
      setQuestions([]);
      onSessionComplete?.();
    }
  }, [saveQuestionsMutation, questions, onSessionComplete]);

  const handleQuestionsClose = useCallback(() => {
    setShowQuestions(false);
    setQuestions([]);
    console.log('🚪 Questions closed manually');
  }, []);

  // Debug functions
  useEffect(() => {
    if (typeof window !== 'undefined' && submissionId) {
      (window as any).debugWritingSession = () => {
        const currentWordCount = getCurrentWordCount();
        console.log('🐛 Writing Session Debug:', {
          submissionId,
          currentWordCount,
          lastQuestionWordCount,
          wordsUntilNext: currentWordCount < 10 ? 10 - currentWordCount : 10 - (currentWordCount % 10),
          showQuestions,
          questionsCount: questions.length,
          isGenerating,
          isBlocked: showQuestions || isGenerating,
          contentLength: content.length,
          lastQuestionContentLength: lastQuestionContentRef.current.length
        });
      };
      
      (window as any).forceResetSession = () => {
        console.log('🔧 Force resetting session...');
        setShowQuestions(false);
        setQuestions([]);
        setIsGenerating(false);
        setLastQuestionWordCount(0);
        lastQuestionContentRef.current = '';
        isInitializedRef.current = false;
      };

      (window as any).forceTriggerQuestions = () => {
        console.log('🔥 Force triggering questions...');
        if (content.length > 0) {
          setIsGenerating(true);
          setLastQuestionWordCount(getCurrentWordCount());
          generateQuestionsMutation.mutate();
        } else {
          console.log('❌ Cannot trigger questions - no content');
        }
      };
    }
  }, [submissionId, getCurrentWordCount, lastQuestionWordCount, showQuestions, questions.length, isGenerating, content.length]);

  const currentWordCount = getCurrentWordCount();
  const wordsUntilQuestions = currentWordCount < 10 
    ? 10 - currentWordCount 
    : 10 - (currentWordCount % 10);

  return {
    currentWordCount,
    wordsUntilQuestions,
    showQuestions,
    questions,
    handleQuestionsComplete,
    handleQuestionsClose,
    isLoading: generateQuestionsMutation.isPending || saveQuestionsMutation.isPending || isGenerating,
    isBlocked: showQuestions || isGenerating
  };
} 