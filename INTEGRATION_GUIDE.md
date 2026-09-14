# Integration Guide: Using Enhanced Features in Assessment Component

This guide shows how to integrate the new features into your Assessment component usage.

## 1. Import New Components & Utilities

Add these imports to your Assessment.js file:

```javascript
// Components
import AssessmentFeatures from './AssessmentFeatures';
import ReviewMode from './ReviewMode';

// Utilities
import { 
  getDifficultyVariant, 
  getQuestionsWithHints,
  recommendDifficulty,
  filterQuestionsByDifficulty 
} from '../utils/difficultyManager';
```

## 2. Using AssessmentFeatures Component

Display the feature panel during assessments:

```javascript
<AssessmentFeatures
  // Timer Props
  timerEnabled={timerEnabled}
  timeRemaining={timeRemaining}
  showTimeWarning={showTimeWarning}
  
  // Hints Props
  hintsAvailable={hintsAvailable}
  hintsUsed={hintsUsed}
  onHintClick={() => revealHint(currentQuestionIndex)}
  
  // Difficulty Props
  selectedDifficulty={selectedDifficulty}
  onDifficultyChange={setSelectedDifficulty}
  difficultySelectionMode={difficultySelection}
  onStartAssessment={startTimer}
  
  // Bookmarks Props
  bookmarkedCount={bookmarkedQuestions.size}
  currentQuestionIndex={currentQuestionIndex}
  totalQuestions={comprehensionData?.questions?.length || 0}
  isBookmarked={bookmarkedQuestions.has(currentQuestionIndex)}
  onToggleBookmark={() => toggleBookmark(currentQuestionIndex)}
/>
```

## 3. Applying Difficulty Filtering

Load data with applied difficulty:

```javascript
// When loading assessment data
const handleLanguageSelect = (selectedLanguage) => {
  setLanguage(selectedLanguage);
  
  // ... existing code to get groups ...
  
  const selectedCards = getRandomGroup(groups);
  
  // NEW: Apply difficulty filtering
  const difficultyAdjustedCards = selectedCards.map(card => 
    getDifficultyVariant(card, selectedDifficulty)
  );
  
  // ... rest of existing code ...
};
```

## 4. Using Hints During Assessment

```javascript
// Already implemented in Assessment.js, but here's the flow:

// When student clicks hint button
revealHint(currentQuestionIndex);
// → hintsUsed increases
// → currentHint is populated
// → showHint toggles true

// In your question display render:
{showHint && hintQuestionIndex === currentQuestionIndex && (
  <div className="hint-box">
    💡 Hint: {currentHint}
  </div>
)}
```

## 5. Implementing Review Mode

After assessment completion:

```javascript
const submitComprehensionAssessment = async () => {
  // ... existing submission code ...
  
  // Get results from backend
  const response = await axios.post(`${API_URL}/assess-comprehension`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  
  setResults(response.data);
  setAssessmentStage('complete'); // Changes to review/results stage
  
  // NEW: Calculate metrics for review
  const accuracy = (response.data.correctCount / comprehensionData.questions.length) * 100;
  updateAdaptiveDifficulty(); // Calculate suggested difficulty
};

// In your render, show review when complete:
{assessmentStage === 'complete' && (
  <ReviewMode
    questions={comprehensionData.questions}
    answers={answerResults}
    userAnswers={results.answers}
    paragraph={comprehensionData.paragraph}
    explanations={results.explanations}
    onClose={() => {
      // Save metrics and return to dashboard
      saveAssessmentMetrics();
      navigate('/student-dashboard');
    }}
  />
)}
```

## 6. Saving Bookmarks to Backend

```javascript
const saveBookmarks = async () => {
  try {
    const response = await axios.post(`${API_URL}/save-bookmarks`, {
      bookmarkedQuestions: Array.from(bookmarkedQuestions),
      assessmentId: comprehensionData.id,
      language: language,
      standard: currentUser.standard
    });
    
    console.log('Bookmarks saved:', response.data);
  } catch (error) {
    console.error('Error saving bookmarks:', error);
  }
};

// Call this before returning to dashboard:
{showReviewMode && (
  <ReviewMode
    // ... props ...
    onClose={() => {
      saveBookmarks(); // Save before closing
      navigate('/student-dashboard');
    }}
  />
)}
```

## 7. Implementing Adaptive Difficulty

```javascript
// After getting assessment results, track performance:

const trackPerformance = async (accuracy, correctCount, totalCount) => {
  try {
    const response = await axios.post(
      `${API_URL}/track-performance`,
      {
        accuracy: accuracy / 100,
        difficulty: selectedDifficulty,
        correctAnswers: correctCount,
        totalAnswers: totalCount,
        language: language,
        standard: currentUser.standard
      }
    );
    
    if (response.data.suggestedDifficulty) {
      setSuggestedDifficulty(response.data.suggestedDifficulty);
      
      // Show suggestion to user
      alert(`Great work! We suggest trying ${response.data.suggestedDifficulty} difficulty next time.`);
    }
  } catch (error) {
    console.error('Error tracking performance:', error);
  }
};

// Call after assessment submission:
const handleSubmit = async () => {
  const response = await submitAssessment();
  const accuracy = (response.correctCount / totalAnswers) * 100;
  
  // Track performance and get suggestion
  await trackPerformance(accuracy, response.correctCount, totalAnswers);
  
  // Show results and review
  setResults(response);
  setAssessmentStage('complete');
};
```

## 8. Timer Integration

```javascript
// Start timer when assessment begins
const startAssessment = () => {
  setDifficultySelection(false);
  setAssessmentStartTime(Date.now());
  setTimeRemaining(totalTimeLimit);
  setTimerEnabled(true);
};

// Handle auto-submit when timer expires (already in useEffect)
useEffect(() => {
  if (!timerEnabled || !assessmentStartTime) return;
  
  const timerInterval = setInterval(() => {
    setTimeRemaining(prev => {
      if (prev <= 60) setShowTimeWarning(true);
      
      if (prev <= 1) {
        // Auto-submit
        clearInterval(timerInterval);
        handleAutoSubmit();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  
  return () => clearInterval(timerInterval);
}, [timerEnabled, assessmentStartTime]);
```

## 9. Loading Timer Settings from Backend

```javascript
// On component mount or when student loads assessment
useEffect(() => {
  const loadTimerSettings = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/timer-settings/${currentUser.standard}`
      );
      
      setTotalTimeLimit(response.data.timeLimit);
      setTimerEnabled(response.data.timerEnabled);
    } catch (error) {
      console.error('Error loading timer settings:', error);
    }
  };
  
  if (currentUser?.standard) {
    loadTimerSettings();
  }
}, [currentUser]);
```

## 10. Complete Workflow Example

```javascript
// Full assessment flow with all features:

const completeAssessmentFlow = async () => {
  // Step 1: Select difficulty
  if (difficultySelection) {
    return <ChooseDifficulty onSelect={handleDifficultySelect} />;
  }
  
  // Step 2: Display assessment with features
  return (
    <>
      <AssessmentFeatures {...featureProps} />
      <AssessmentContent
        data={getDifficultyVariant(comprehensionData, selectedDifficulty)}
      />
    </>
  );
};

// When student submits
const handleSubmit = async () => {
  // Save metrics
  await axios.post(`${API_URL}/save-assessment-metrics`, {
    language,
    standard: currentUser.standard,
    difficulty: selectedDifficulty,
    score: calculateScore(),
    timeSpent: totalTimeLimit - timeRemaining,
    hintsUsed,
    bookmarkedQuestions: Array.from(bookmarkedQuestions)
  });
  
  // Save bookmarks
  await saveBookmarks();
  
  // Track performance
  const accuracy = calculateAccuracy();
  await trackPerformance(accuracy);
  
  // Show review
  setShowReviewMode(true);
};
```

## 11. State Summary

All the state you need:

```javascript
// Timer
const [timerEnabled, setTimerEnabled] = useState(false);
const [timeRemaining, setTimeRemaining] = useState(600);

// Difficulty
const [selectedDifficulty, setSelectedDifficulty] = useState('MEDIUM');
const [difficultySelection, setDifficultySelection] = useState(true);

// Hints
const [hintsUsed, setHintsUsed] = useState(0);
const [showHint, setShowHint] = useState(false);

// Review & Bookmarks
const [showReviewMode, setShowReviewMode] = useState(false);
const [bookmarkedQuestions, setBookmarkedQuestions] = useState(new Set());

// Adaptive Difficulty
const [suggestedDifficulty, setSuggestedDifficulty] = useState(null);
```

## 12. Troubleshooting

**Timer not starting?**
- Check `timerEnabled` is true
- Verify `useEffect` hook is running
- Check browser console for errors

**Hints not working?**
- Verify `hintsAvailable > hintsUsed`
- Check if `revealHint()` is called
- Ensure hints are rendered when `showHint === true`

**Review mode not showing?**
- Check `assessmentStage === 'complete'`
- Verify results are populated
- Check if ReviewMode component is imported

**Bookmarks not saving?**
- Verify backend is running
- Check network tab for API errors
- Ensure axios is configured correctly

**Adaptive difficulty not suggesting?**
- Check accuracy calculation is correct
- Verify performance tracking API response
- Check thresholds in difficultyManager.js

---

**For more details, see ENHANCED_FEATURES_GUIDE.md**
