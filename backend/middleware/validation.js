const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array() 
    });
  }
  
  next();
}

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  
  // Remove HTML tags and dangerous characters
  return value
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove < and >
    .substring(0, 500); // Limit length to prevent DoS
}

/**
 * Custom sanitizer for all string inputs
 */
const customSanitizers = {
  sanitizeInput: (value) => sanitizeString(value)
};

/**
 * Validation rules for student registration
 */
const validateStudentRegistration = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .customSanitizer(sanitizeString),
  
  body('rollno')
    .notEmpty().withMessage('Roll number is required')
    .isLength({ min: 1, max: 50 }).withMessage('Roll number must be 1-50 characters')
    .customSanitizer(sanitizeString),
  
  body('school')
    .notEmpty().withMessage('School is required')
    .isLength({ min: 2, max: 200 }).withMessage('School name must be 2-200 characters')
    .customSanitizer(sanitizeString),
  
  body('std')
    .notEmpty().withMessage('Standard is required')
    .isIn(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
    .withMessage('Invalid standard'),
  
  body('age')
    .notEmpty().withMessage('Age is required')
    .isInt({ min: 5, max: 25 }).withMessage('Age must be between 5 and 25'),
  
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
    .customSanitizer(sanitizeString),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6, max: 100 }).withMessage('Password must be at least 6 characters'),
  
  handleValidationErrors
];

/**
 * Validation rules for admin registration
 */
const validateAdminRegistration = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .customSanitizer(sanitizeString),
  
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
    .customSanitizer(sanitizeString),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 100 }).withMessage('Password must be at least 8 characters'),
  
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['system_admin', 'school_admin']).withMessage('Invalid role'),
  
  body('schoolId')
    .optional()
    .isMongoId().withMessage('Invalid school ID'),
  
  handleValidationErrors
];

/**
 * Validation rules for login
 */
const validateLogin = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .customSanitizer(sanitizeString),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Validation rules for school creation
 */
const validateSchool = [
  body('name')
    .notEmpty().withMessage('School name is required')
    .isLength({ min: 2, max: 200 }).withMessage('School name must be 2-200 characters')
    .customSanitizer(sanitizeString),
  
  body('address')
    .optional({ checkFalsy: true })
    .isLength({ max: 300 }).withMessage('Address must be less than 300 characters')
    .customSanitizer(sanitizeString),
  
  body('city')
    .optional({ checkFalsy: true })
    .isLength({ max: 100 }).withMessage('City must be less than 100 characters')
    .customSanitizer(sanitizeString),
  
  body('state')
    .optional({ checkFalsy: true })
    .isLength({ max: 100 }).withMessage('State must be less than 100 characters')
    .customSanitizer(sanitizeString),
  
  handleValidationErrors
];

/**
 * Validation rules for assessment submission
 */
const validateAssessment = [
  body('student_id')
    .notEmpty().withMessage('Student ID is required')
    .isMongoId().withMessage('Invalid student ID'),
  
  body('student_name')
    .notEmpty().withMessage('Student name is required')
    .customSanitizer(sanitizeString),
  
  body('standard')
    .notEmpty().withMessage('Standard is required')
    .isIn(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])
    .withMessage('Invalid standard'),
  
  body('expected_words')
    .notEmpty().withMessage('Expected words are required'),
  
  body('language')
    .optional()
    .isIn(['english', 'hindi', 'marathi', 'science', 'maths']).withMessage('Language must be one of: english, hindi, marathi, science, maths'),
  
  handleValidationErrors
];

/**
 * Validation rules for edit request
 */
const validateEditRequest = [
  body('studentId')
    .notEmpty().withMessage('Student ID is required')
    .isMongoId().withMessage('Invalid student ID'),
  
  body('requestedChanges')
    .notEmpty().withMessage('Requested changes are required')
    .isObject().withMessage('Requested changes must be an object'),
  
  body('reason')
    .notEmpty().withMessage('Reason is required')
    .isLength({ min: 10, max: 500 }).withMessage('Reason must be 10-500 characters')
    .customSanitizer(sanitizeString),
  
  handleValidationErrors
];

/**
 * Validation rules for MongoDB ID parameter
 */
const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName}`),
  
  handleValidationErrors
];

/**
 * Validation rules for pagination query parameters
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  sanitizeString,
  validateStudentRegistration,
  validateAdminRegistration,
  validateLogin,
  validateSchool,
  validateAssessment,
  validateEditRequest,
  validateMongoId,
  validatePagination
};
