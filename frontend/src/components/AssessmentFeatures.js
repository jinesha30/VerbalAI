import React from 'react';
import './AssessmentFeatures.css';

const AssessmentFeatures = ({
  timerEnabled,
  timeRemaining,
  showTimeWarning,
  hintsAvailable,
  hintsUsed,
  onHintClick,
  selectedDifficulty,
  onDifficultyChange,
  bookmarkedCount,
  currentQuestionIndex,
  totalQuestions,
  isBookmarked,
  onToggleBookmark,
  difficultySelectionMode = false,
  onStartAssessment
}) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const canUseHint = hintsUsed < hintsAvailable;

  return (
    <div className="assessment-features-container">
      {/* Difficulty Selection Mode */}
      {difficultySelectionMode && (
        <div className="difficulty-selector-panel">
          <h3>Select Difficulty Level</h3>
          <div className="difficulty-options">
            <button
              className={`difficulty-btn easy ${selectedDifficulty === 'EASY' ? 'selected' : ''}`}
              onClick={() => onDifficultyChange('EASY')}
            >
              <span className="difficulty-icon">⭐</span>
              <span className="difficulty-name">Easy</span>
              <span className="difficulty-desc">Fewer questions</span>
            </button>
            <button
              className={`difficulty-btn medium ${selectedDifficulty === 'MEDIUM' ? 'selected' : ''}`}
              onClick={() => onDifficultyChange('MEDIUM')}
            >
              <span className="difficulty-icon">⭐⭐</span>
              <span className="difficulty-name">Medium</span>
              <span className="difficulty-desc">Standard difficulty</span>
            </button>
            <button
              className={`difficulty-btn hard ${selectedDifficulty === 'HARD' ? 'selected' : ''}`}
              onClick={() => onDifficultyChange('HARD')}
            >
              <span className="difficulty-icon">⭐⭐⭐</span>
              <span className="difficulty-name">Hard</span>
              <span className="difficulty-desc">All questions</span>
            </button>
          </div>
          <button className="start-btn" onClick={onStartAssessment}>
            Start Assessment
          </button>
        </div>
      )}

      {/* Timer Feature */}
      {timerEnabled && (
        <div className={`timer-widget ${showTimeWarning ? 'warning' : ''}`}>
          <span className="timer-label">⏱️ Time:</span>
          <span className={`timer-display ${showTimeWarning ? 'warning-time' : ''}`}>
            {formatTime(timeRemaining)}
          </span>
          {showTimeWarning && (
            <span className="timer-warning-text">⚠️ Running out of time!</span>
          )}
        </div>
      )}

      {/* Hints Feature */}
      <div className="hints-widget">
        <button
          className={`hints-btn ${canUseHint ? 'available' : 'disabled'}`}
          onClick={onHintClick}
          disabled={!canUseHint}
          title={canUseHint ? 'Click to reveal a hint' : 'No more hints available'}
        >
          <span className="hints-icon">💡</span>
          <span className="hints-text">
            Hints: {hintsAvailable - hintsUsed}/{hintsAvailable}
          </span>
        </button>
        {hintsUsed > 0 && (
          <div className="hints-used-info">
            {hintsUsed} hint(s) used
          </div>
        )}
      </div>

      {/* Bookmarks Feature */}
      {totalQuestions > 0 && (
        <div className="bookmark-widget">
          <button
            className={`bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
            onClick={onToggleBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
          >
            <span className="bookmark-icon">
              {isBookmarked ? '🔖' : '📌'}
            </span>
            <span className="bookmark-text">
              {bookmarkedCount > 0 ? `Bookmarked: ${bookmarkedCount}` : 'Bookmark'}
            </span>
          </button>
        </div>
      )}

      {/* Difficulty Badge */}
      <div className="difficulty-badge">
        <span className="badge-label">Difficulty:</span>
        <span className={`badge-value ${selectedDifficulty.toLowerCase()}`}>
          {selectedDifficulty}
        </span>
      </div>

      {/* Progress Indicator */}
      {totalQuestions > 0 && (
        <div className="progress-indicator">
          <span className="progress-text">
            Q{currentQuestionIndex + 1}/{totalQuestions}
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentFeatures;
