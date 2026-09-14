import React, { useState } from 'react';
import './ReviewMode.css';

const ReviewMode = ({ 
  questions, 
  answers, 
  userAnswers, 
  paragraph, 
  onClose,
  explanations = {}
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAllAnswers, setShowAllAnswers] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      <div className="review-mode-container">
        <p>No questions to review.</p>
        <button onClick={onClose}>Close Review</button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentUserAnswer = userAnswers && userAnswers[currentQuestionIndex];
  const isCorrect = currentUserAnswer && currentUserAnswer.isCorrect;

  const calculateScore = () => {
    if (!answers) return 0;
    return answers.reduce((count, ans) => count + (ans.isCorrect ? 1 : 0), 0);
  };

  const totalScore = calculateScore();
  const percentage = Math.round((totalScore / questions.length) * 100);

  return (
    <div className="review-mode-container">
      <div className="review-header">
        <h2>📋 Assessment Review</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="review-score-card">
        <div className="score-display">
          <div className="score-circle">
            <span className="score-number">{totalScore}/{questions.length}</span>
            <span className="score-percent">{percentage}%</span>
          </div>
          <div className="score-feedback">
            {percentage >= 80 && <p>🌟 Excellent work!</p>}
            {percentage >= 60 && percentage < 80 && <p>👍 Good effort!</p>}
            {percentage >= 40 && percentage < 60 && <p>📚 Keep practicing!</p>}
            {percentage < 40 && <p>💪 More practice needed!</p>}
          </div>
        </div>
      </div>

      {paragraph && (
        <div className="review-paragraph">
          <h3>Passage:</h3>
          <p className="paragraph-text">{paragraph}</p>
        </div>
      )}

      <div className="review-questions">
        <h3>Questions & Answers</h3>

        <div className="question-navigator">
          <button 
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="nav-btn"
          >
            ← Previous
          </button>
          <span className="question-counter">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <button 
            onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex === questions.length - 1}
            className="nav-btn"
          >
            Next →
          </button>
        </div>

        <div className={`question-review-card ${isCorrect ? 'correct' : 'incorrect'}`}>
          <div className="question-header">
            <h4>Q{currentQuestionIndex + 1}: {currentQuestion.text}</h4>
            <span className={`result-badge ${isCorrect ? 'correct' : 'incorrect'}`}>
              {isCorrect ? '✓ Correct' : '✗ Incorrect'}
            </span>
          </div>

          <div className="answer-section">
            <div className="user-answer">
              <label>📝 Your Answer:</label>
              <p className={`answer-text ${isCorrect ? 'correct-answer' : 'wrong-answer'}`}>
                {currentUserAnswer?.userAnswer || currentUserAnswer || 'Not answered'}
              </p>
            </div>

            {!isCorrect && (
              <div className="correct-answer">
                <label>✓ Correct Answer:</label>
                <p className="answer-text correct-answer-text">
                  {currentQuestion.answer}
                </p>
              </div>
            )}
          </div>

          <div className="explanation-section">
            <h4>💡 Explanation</h4>
            <p className="explanation-text">
              {explanations[currentQuestionIndex] || 
               `The correct answer to this question is: "${currentQuestion.answer}". This demonstrates your understanding of the concept covered in the passage.`}
            </p>
          </div>

          {currentQuestion.hint && (
            <div className="hint-section">
              <label>💭 Hint (was available):</label>
              <p className="hint-text">{currentQuestion.hint}</p>
            </div>
          )}
        </div>

        <div className="all-answers-toggle">
          <button 
            className="toggle-btn"
            onClick={() => setShowAllAnswers(!showAllAnswers)}
          >
            {showAllAnswers ? 'Hide' : 'Show'} All Answers
          </button>
        </div>

        {showAllAnswers && (
          <div className="all-answers-grid">
            {questions.map((q, idx) => (
              <div 
                key={idx} 
                className={`answer-grid-item ${answers[idx]?.isCorrect ? 'correct' : 'incorrect'}`}
                onClick={() => setCurrentQuestionIndex(idx)}
                style={{ cursor: 'pointer' }}
              >
                <span className="grid-number">Q{idx + 1}</span>
                <span className="grid-icon">
                  {answers[idx]?.isCorrect ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="review-footer">
        <button className="close-btn large" onClick={onClose}>
          Close Review & Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ReviewMode;
