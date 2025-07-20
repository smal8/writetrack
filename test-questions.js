// Test script to verify question and answer saving
const testQuestionSaving = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/sessions/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        submissionId: 69, // Use the submission ID from your logs
        questions: [
          {
            id: 'test_q1',
            question: 'What is your main argument in this essay?'
          },
          {
            id: 'test_q2', 
            question: 'How does your evidence support your thesis?'
          }
        ],
        answers: [
          {
            questionId: 'test_q1',
            answer: 'My main argument is about education reform.',
            timeToAnswer: 15.5, // This should now convert to 16 (integer)
            timedOut: false
          },
          {
            questionId: 'test_q2',
            answer: 'The evidence shows clear patterns.',
            timeToAnswer: 22.3, // This should convert to 22 (integer)
            timedOut: false
          }
        ],
        contextContent: 'This is test content for the essay'
      })
    });

    const result = await response.json();
    console.log('Test result:', result);
    
    if (result.success) {
      console.log('✅ Questions and answers saved successfully!');
      console.log(`Session ID: ${result.sessionId}`);
      console.log(`Questions saved: ${result.questionsCount}`);
      console.log(`Answers saved: ${result.answersCount}`);
    } else {
      console.log('❌ Failed to save questions and answers');
    }

  } catch (error) {
    console.error('Test error:', error);
  }
};

console.log('🧪 Testing question and answer saving...');
testQuestionSaving(); 