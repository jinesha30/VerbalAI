// Utility functions for difficulty mode assessment variants

export const getDifficultyVariant = (data, difficulty = 'MEDIUM') => {
  if (!data) return null;

  // For word/sentence/paragraph types, difficulty affects the number of items shown
  if (Array.isArray(data)) {
    return filterByDifficulty(data, difficulty);
  }

  // For comprehension type data with questions
  if (data.type === 'comprehension') {
    return getComprehensionVariant(data, difficulty);
  }

  return data;
};

const filterByDifficulty = (cards, difficulty) => {
  if (!cards || cards.length === 0) return cards;

  // EASY: Show fewer, simpler items
  // MEDIUM: Show default items
  // HARD: Show all items with extra challenges
  const difficultyLimits = {
    'EASY': Math.ceil(cards.length * 0.6),
    'MEDIUM': cards.length,
    'HARD': cards.length
  };

  const limitedCards = cards.slice(0, difficultyLimits[difficulty]);
  return limitedCards;
};

const getComprehensionVariant = (comprehension, difficulty) => {
  const variant = { ...comprehension };

  // For comprehension, difficulty affects question selection
  if (comprehension.questions && comprehension.questions.length > 0) {
    switch (difficulty) {
      case 'EASY':
        // Keep easier questions (first 50% of questions)
        variant.questions = comprehension.questions.slice(
          0,
          Math.ceil(comprehension.questions.length / 2)
        );
        // Add hint field for easier mode
        variant.questions = variant.questions.map(q => ({
          ...q,
          hint: generateHint(q.answer),
          difficulty: 'easy'
        }));
        break;

      case 'MEDIUM':
        // Keep all questions with varying difficulty
        variant.questions = comprehension.questions.map(q => ({
          ...q,
          hint: generateHint(q.answer),
          difficulty: 'medium'
        }));
        break;

      case 'HARD':
        // All questions plus additional inference questions
        variant.questions = comprehension.questions.map((q, idx) => ({
          ...q,
          hint: generateHint(q.answer),
          difficulty: 'hard',
          order: idx + 1
        }));
        // Add metadata for harder tracking
        variant.includeInference = true;
        variant.timeLimit = 60; // 1 min per question in hard mode
        break;

      default:
        variant.questions = comprehension.questions;
    }
  }

  return variant;
};

const generateHint = (answer) => {
  if (!answer) return '';

  const answerStr = answer.toString().toUpperCase();
  const len = answerStr.length;

  // Generate progressive hints
  if (len <= 3) {
    return `The answer has ${len} characters and starts with '${answerStr[0]}'`;
  } else {
    const firstHalf = answerStr.substring(0, Math.ceil(len / 2));
    return `The answer starts with '${firstHalf}' and has ${len} characters`;
  }
};

// Get assessment with specifications hints based on difficulty
export const getQuestionsWithHints = (questions, difficulty = 'MEDIUM') => {
  if (!questions || !Array.isArray(questions)) return [];

  return questions.map((q, idx) => ({
    ...q,
    difficulty,
    hintIndex: idx,
    hint: generateHint(q.answer),
    explanation: getExplanation(q.answer)
  }));
};

const getExplanation = (answer) => {
  const answerStr = answer.toString().toUpperCase();

  // Generic explanations based on common answer types
  const explanations = {
    'PHOTOSYNTHESIS': 'Plants use photosynthesis to convert sunlight into chemical energy.',
    'CHLOROPHYLL': 'Chlorophyll is the green pigment in plant cells that absorbs sunlight.',
    'MITOCHONDRIA': 'Mitochondria is the powerhouse of the cell, producing energy.',
    'NUCLEUS': 'The nucleus controls cell functions and contains genetic information.',
    'EVAPORATION': 'Evaporation is when liquid water turns into water vapor due to heat.',
    'CONDENSATION': 'Condensation is when water vapor cools and turns into liquid water.',
    'SUN': 'The sun is the primary source of energy for Earth and all life on it.',
    'WATER': 'Water is essential for all life and covers most of Earth\'s surface.',
    'OXYGEN': 'Oxygen is produced by plants and is essential for respiration in animals.'
  };

  return explanations[answerStr] || `The correct answer is: ${answerStr}`;
};

// Function to calculate difficulty recommendation based on performance
export const recommendDifficulty = (accuracy, currentDifficulty, threshold = { easy: 0.85, medium: 0.70, hard: 0.50 }) => {
  if (accuracy >= threshold.easy && currentDifficulty !== 'HARD') {
    return 'HARD'; // User is performing very well, increase difficulty
  } else if (accuracy >= threshold.medium && currentDifficulty === 'EASY') {
    return 'MEDIUM'; // User is doing well, increase from EASY to MEDIUM
  } else if (accuracy < threshold.hard && currentDifficulty === 'HARD') {
    return 'MEDIUM'; // User is struggling at HARD, decrease to MEDIUM
  } else if (accuracy < 0.3 && currentDifficulty === 'MEDIUM') {
    return 'EASY'; // User is struggling significantly, decrease to EASY
  }

  return currentDifficulty; // No change needed
};

// Filter questions based on difficulty
export const filterQuestionsByDifficulty = (questions, difficulty) => {
  if (!questions) return [];

  const difficultyMap = {
    'EASY': q => !q.isInference, // Exclude inference questions
    'MEDIUM': () => true, // Include all
    'HARD': () => true // Include all (could add bonus questions here)
  };

  return questions.filter(difficultyMap[difficulty] || (() => true));
};
