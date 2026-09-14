const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const bcrypt = require('bcrypt');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Import middleware
const { generateToken, verifyToken, verifyAdmin, verifySystemAdmin, verifyStudent, verifyOwnData } = require('./middleware/auth');
const {
  validateStudentRegistration,
  validateAdminRegistration,
  validateLogin,
  validateSchool,
  validateAssessment,
  validateEditRequest,
  validateMongoId
} = require('./middleware/validation');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting - configurable via environment variables
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 10,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(compression()); // Compress responses
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(limiter); // Apply rate limiting to all requests

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learning_assessment_db')
  .then(() => console.log('✓ MongoDB connected successfully'))
  .catch(err => {
    console.log('✗ MongoDB connection error:', err.message);
    console.log('⚠ Running without MongoDB - data will not be persisted');
  });

// MongoDB Schemas
const SchoolSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  hasAdmin: { type: Boolean, default: false },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
SchoolSchema.index({ name: 1 });
SchoolSchema.index({ hasAdmin: 1 });
SchoolSchema.index({ isDeleted: 1 });

// Update timestamp on save
SchoolSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['system_admin', 'school_admin'], required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  schoolName: { type: String },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
AdminSchema.index({ username: 1 });
AdminSchema.index({ email: 1 });
AdminSchema.index({ role: 1 });
AdminSchema.index({ schoolId: 1 });
AdminSchema.index({ isDeleted: 1 });

// Update timestamp on save
AdminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollno: { type: String, required: true },
  school: { type: String, required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  standard: { type: String, required: true },
  age: { type: Number, required: true },
  email: String,
  phone: String,
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  totalPoints: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastPracticeDate: { type: String },
  badges: [{
    key: String,
    title: String,
    description: String,
    earnedAt: { type: Date, default: Date.now }
  }],
  certificatesEarned: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  registeredAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
StudentSchema.index({ username: 1 });
StudentSchema.index({ schoolId: 1 });
StudentSchema.index({ standard: 1 });
StudentSchema.index({ rollno: 1, schoolId: 1 });
StudentSchema.index({ isDeleted: 1 });

// Update timestamp on save
StudentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const AssessmentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  standard: { type: String, required: true },
  language: { type: String, default: 'english' }, // 'english', 'hindi', 'marathi' or 'science'
  assessmentType: { type: String, default: 'standard' },
  score: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  totalCount: { type: Number, required: true },
  accuracy: { type: Number },
  durationSeconds: { type: Number },
  hintsUsed: { type: Number, default: 0 },
  bookmarkedCount: { type: Number, default: 0 },
  paragraphScore: { type: Number },
  answersScore: { type: Number },
  transcribedText: { type: String },
  details: [{
    expected: String,
    recognized: String,
    similarity: Number,
    correct: Boolean
  }],
  expectedWords: [String],
  timestamp: { type: Date, default: Date.now },
  date: { type: String }
});

// Indexes for performance
AssessmentSchema.index({ studentId: 1 });
AssessmentSchema.index({ studentName: 1 });
AssessmentSchema.index({ standard: 1 });
AssessmentSchema.index({ date: 1 });
AssessmentSchema.index({ timestamp: -1 });
AssessmentSchema.index({ language: 1 });
AssessmentSchema.index({ studentId: 1, date: -1 });

const EditRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: { type: String, required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  schoolName: { type: String, required: true },
  currentData: {
    name: String,
    rollno: String,
    age: Number,
    email: String,
    phone: String
  },
  requestedChanges: {
    name: String,
    rollno: String,
    age: Number,
    email: String,
    phone: String
  },
  reason: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  reviewedAt: { type: Date },
  reviewNote: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
EditRequestSchema.index({ studentId: 1 });
EditRequestSchema.index({ schoolId: 1 });
EditRequestSchema.index({ status: 1 });
EditRequestSchema.index({ createdAt: -1 });

// Update timestamp on save
EditRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Audit Log Schema for tracking admin actions
const AuditLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  adminName: { type: String, required: true },
  adminRole: { type: String, required: true },
  action: { type: String, required: true }, // e.g., 'STUDENT_DELETED', 'EDIT_REQUEST_APPROVED'
  targetType: { type: String, required: true }, // e.g., 'Student', 'EditRequest', 'School'
  targetId: { type: String },
  targetName: { type: String },
  details: { type: mongoose.Schema.Types.Mixed }, // Additional details about the action
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now }
});

// Indexes for audit log
AuditLogSchema.index({ adminId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ targetType: 1 });
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ adminId: 1, timestamp: -1 });

const School = mongoose.model('School', SchoolSchema);
const Admin = mongoose.model('Admin', AdminSchema);
const Student = mongoose.model('Student', StudentSchema);
const Assessment = mongoose.model('Assessment', AssessmentSchema);
const EditRequest = mongoose.model('EditRequest', EditRequestSchema);
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// Password Reset Token Schema
const PasswordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userType: { type: String, enum: ['student', 'admin'], required: true },
  username: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Index for cleanup and queries
PasswordResetSchema.index({ token: 1 });
PasswordResetSchema.index({ expiresAt: 1 });
PasswordResetSchema.index({ userId: 1, used: 1 });

const PasswordReset = mongoose.model('PasswordReset', PasswordResetSchema);

function getAssessmentAccuracy(assessment) {
  if (typeof assessment.accuracy === 'number' && !Number.isNaN(assessment.accuracy)) {
    return assessment.accuracy;
  }

  if (assessment.totalCount > 0) {
    return (assessment.correctCount / assessment.totalCount) * 100;
  }

  return 0;
}

function getAssessmentTimestamp(assessment) {
  return assessment.timestamp ? new Date(assessment.timestamp) : new Date();
}

function getDaysSince(dateValue) {
  const currentTime = Date.now();
  const comparisonTime = new Date(dateValue).getTime();
  if (Number.isNaN(comparisonTime)) {
    return 0;
  }

  return Math.max(0, Math.floor((currentTime - comparisonTime) / (1000 * 60 * 60 * 24)));
}

function getTrendDirection(assessments) {
  if (!assessments || assessments.length < 2) {
    return 'stable';
  }

  const ordered = [...assessments].sort((a, b) => getAssessmentTimestamp(a) - getAssessmentTimestamp(b));
  const splitPoint = Math.max(1, Math.floor(ordered.length / 2));
  const earlier = ordered.slice(0, splitPoint);
  const later = ordered.slice(splitPoint);

  if (later.length === 0) {
    return 'stable';
  }

  const earlierAverage = earlier.reduce((sum, assessment) => sum + assessment.score, 0) / earlier.length;
  const laterAverage = later.reduce((sum, assessment) => sum + assessment.score, 0) / later.length;

  if (laterAverage > earlierAverage + 5) return 'improving';
  if (laterAverage < earlierAverage - 5) return 'declining';
  return 'stable';
}

function buildTopicStats(assessments) {
  const grouped = assessments.reduce((accumulator, assessment) => {
    const topic = (assessment.language || assessment.assessmentType || 'general').toLowerCase();

    if (!accumulator[topic]) {
      accumulator[topic] = {
        subject: topic,
        label: assessment.language || assessment.assessmentType || 'General',
        count: 0,
        totalScore: 0,
        totalAccuracy: 0,
        latestAt: null
      };
    }

    const accuracy = getAssessmentAccuracy(assessment);
    accumulator[topic].count += 1;
    accumulator[topic].totalScore += assessment.score || 0;
    accumulator[topic].totalAccuracy += accuracy;

    const assessmentDate = getAssessmentTimestamp(assessment);
    if (!accumulator[topic].latestAt || assessmentDate > accumulator[topic].latestAt) {
      accumulator[topic].latestAt = assessmentDate;
    }

    accumulator[topic].avgScore = accumulator[topic].totalScore / accumulator[topic].count;
    accumulator[topic].avgAccuracy = accumulator[topic].totalAccuracy / accumulator[topic].count;

    return accumulator;
  }, {});

  return Object.values(grouped)
    .map((item) => ({
      ...item,
      avgScore: Math.round(item.avgScore * 100) / 100,
      avgAccuracy: Math.round(item.avgAccuracy * 100) / 100,
      latestAt: item.latestAt ? item.latestAt.toISOString() : null
    }))
    .sort((a, b) => a.avgScore - b.avgScore);
}

function buildAdaptiveIntelligence(student, assessments) {
  const orderedAssessments = [...assessments].sort((a, b) => getAssessmentTimestamp(a) - getAssessmentTimestamp(b));
  const topicStats = buildTopicStats(orderedAssessments);
  const strengths = [...topicStats].sort((a, b) => b.avgScore - a.avgScore).slice(0, 2);
  const weaknesses = [...topicStats].slice(0, 2);
  const latestAssessment = orderedAssessments[orderedAssessments.length - 1] || null;
  const latestAccuracy = latestAssessment ? getAssessmentAccuracy(latestAssessment) : 0;
  const averageScore = orderedAssessments.length > 0
    ? orderedAssessments.reduce((sum, assessment) => sum + (assessment.score || 0), 0) / orderedAssessments.length
    : 0;
  const averageAccuracy = orderedAssessments.length > 0
    ? orderedAssessments.reduce((sum, assessment) => sum + getAssessmentAccuracy(assessment), 0) / orderedAssessments.length
    : 0;
  const trend = getTrendDirection(orderedAssessments);
  const daysSinceLastAssessment = latestAssessment ? getDaysSince(latestAssessment.timestamp) : null;

  let recommendedDifficulty = 'MEDIUM';
  if (averageScore >= 85 && latestAccuracy >= 85 && trend !== 'declining') {
    recommendedDifficulty = 'HARD';
  } else if (averageScore < 60 || latestAccuracy < 65 || trend === 'declining') {
    recommendedDifficulty = 'EASY';
  }

  const primaryFocus = weaknesses[0] || strengths[0] || { label: 'general practice', subject: 'general' };
  const secondaryFocus = weaknesses[1] || strengths[1] || primaryFocus;

  const weeklyPlan = [
    {
      day: 'Day 1',
      title: `Review ${primaryFocus.label}`,
      durationMinutes: 15,
      action: `Run a ${recommendedDifficulty.toLowerCase()} practice set focused on ${primaryFocus.label}.`,
      reason: `This is your lowest-scoring area right now.`
    },
    {
      day: 'Day 2',
      title: `Short retrieval for ${secondaryFocus.label}`,
      durationMinutes: 10,
      action: `Answer 5 quick questions in ${secondaryFocus.label} without hints.`,
      reason: 'A short second touch improves retention.'
    },
    {
      day: 'Day 4',
      title: 'Mixed recall session',
      durationMinutes: 12,
      action: `Mix ${primaryFocus.label} with one strength area to build transfer.`,
      reason: 'Alternating weak and strong topics improves memory.'
    },
    {
      day: 'Day 6',
      title: 'Confidence check',
      durationMinutes: 12,
      action: `Take one timed assessment at ${recommendedDifficulty.toLowerCase()} difficulty.`,
      reason: 'Measures whether the practice is sticking.'
    },
    {
      day: 'Day 7',
      title: 'Progress review',
      durationMinutes: 8,
      action: 'Review your score trend and refresh the next weekly plan.',
      reason: 'Keeps the learning cycle active.'
    }
  ];

  const coachSummary = orderedAssessments.length === 0
    ? 'Start with a baseline assessment so the coach can build your learning map.'
    : `Your strongest area is ${strengths[0]?.label || 'your current focus'}, while ${primaryFocus.label} needs the next review.`;

  const coachNextActions = orderedAssessments.length === 0
    ? [
        'Take one baseline assessment to create your initial profile.',
        'Pick a comfortable language and difficulty for the first session.',
        'Return tomorrow for a short review session.'
      ]
    : [
        `Complete the ${weeklyPlan[0].day} plan for ${primaryFocus.label}.`,
        `Aim for at least ${Math.min(95, Math.round(averageScore + 8))}% in your next attempt.`,
        trend === 'declining'
          ? 'Focus on consistency first, then raise difficulty.'
          : 'Keep your streak active with one short practice every 2 to 3 days.'
      ];

  const riskScore = (() => {
    let score = 5;

    if (orderedAssessments.length < 3) score += 18;
    if (averageScore < 50) score += 25;
    else if (averageScore < 65) score += 15;
    else if (averageScore < 75) score += 8;

    if (averageAccuracy < 60) score += 10;
    if (trend === 'declining') score += 16;
    if (student.currentStreak === 0) score += 12;
    else if ((student.currentStreak || 0) < 3) score += 6;

    if (daysSinceLastAssessment === null) score += 10;
    else if (daysSinceLastAssessment >= 7) score += 22;
    else if (daysSinceLastAssessment >= 3) score += 10;

    if (primaryFocus.avgScore < 55) score += 8;

    return Math.min(100, Math.max(0, Math.round(score)));
  })();

  const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

  const riskReasons = [];
  if (averageScore < 65) riskReasons.push(`Average score is ${averageScore.toFixed(1)}%.`);
  if (trend === 'declining') riskReasons.push('Recent performance is trending downward.');
  if (daysSinceLastAssessment !== null && daysSinceLastAssessment >= 3) {
    riskReasons.push(`Last assessment was ${daysSinceLastAssessment} day(s) ago.`);
  }
  if ((student.currentStreak || 0) < 3) riskReasons.push('Streak is below 3 days.');
  if (primaryFocus.avgScore < 60) riskReasons.push(`Weakest area is ${primaryFocus.label}.`);
  if (orderedAssessments.length < 3) riskReasons.push('There is limited assessment history for stable tracking.');

  const interventions = riskLevel === 'high'
    ? [
        `Assign a teacher or guardian check-in for ${primaryFocus.label}.`,
        'Schedule a follow-up assessment within 48 hours.',
        'Use easy difficulty with hints enabled until scores recover.'
      ]
    : riskLevel === 'medium'
      ? [
          'Keep the weekly plan active and monitor score trend.',
          `Retake ${primaryFocus.label} within the next 3 days.`,
          'Maintain a 2 to 3 day practice rhythm.'
        ]
      : [
          'Continue the current plan and gradually raise difficulty.',
          'Celebrate the current streak to reinforce consistency.',
          `Schedule the next review session for ${primaryFocus.label} this week.`
        ];

  return {
    topicStats,
    strengths,
    weaknesses,
    trend,
    averageScore: Math.round(averageScore * 100) / 100,
    averageAccuracy: Math.round(averageAccuracy * 100) / 100,
    latestAssessment,
    latestAccuracy: Math.round(latestAccuracy * 100) / 100,
    daysSinceLastAssessment,
    recommendedDifficulty,
    weeklyPlan,
    coachSummary,
    coachNextActions,
    riskScore,
    riskLevel,
    riskReasons,
    interventions
  };
}

async function buildLlmLearningCoach(student, intelligence) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const endpoint = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';

  const trendLabel = intelligence.trend || 'stable';
  const topStrength = intelligence.strengths[0]?.label || 'current best topic';
  const topWeakness = intelligence.weaknesses[0]?.label || 'current focus topic';

  const prompt = [
    'You are a supportive school learning coach.',
    'Generate personalized coaching in simple student-friendly language.',
    'Keep each response concise and practical.',
    'Return only valid JSON with keys: summary (string), nextActions (array of exactly 3 strings), encouragement (string).',
    '',
    `Student name: ${student.name}`,
    `Standard: ${student.standard}`,
    `Average score: ${intelligence.averageScore}`,
    `Average accuracy: ${intelligence.averageAccuracy}`,
    `Trend: ${trendLabel}`,
    `Recommended difficulty: ${intelligence.recommendedDifficulty}`,
    `Strongest area: ${topStrength}`,
    `Primary focus area: ${topWeakness}`,
    `Risk level: ${intelligence.riskLevel}`
  ].join('\n');

  try {
    const response = await axios.post(
      endpoint,
      {
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are an educational coach for K-12 students. Be clear, positive, and actionable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      }
    );

    const content = response?.data?.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content);
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    const encouragement = typeof parsed.encouragement === 'string' ? parsed.encouragement.trim() : '';
    const nextActions = Array.isArray(parsed.nextActions)
      ? parsed.nextActions
          .filter((item) => typeof item === 'string' && item.trim().length > 0)
          .slice(0, 3)
      : [];

    if (!summary || !encouragement || nextActions.length === 0) {
      return null;
    }

    return {
      summary,
      nextActions,
      encouragement,
      source: 'llm',
      model
    };
  } catch (error) {
    console.warn('LLM learning coach unavailable, using rule-based fallback:', error.message);
    return null;
  }
}

function buildAdminRiskOverview(students, assessments) {
  const assessmentMap = assessments.reduce((accumulator, assessment) => {
    const key = String(assessment.studentId);

    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(assessment);
    return accumulator;
  }, {});

  const rows = students.map((student) => {
    const studentAssessments = assessmentMap[String(student._id)] || [];
    const intelligence = buildAdaptiveIntelligence(student, studentAssessments);

    return {
      studentId: String(student._id),
      name: student.name,
      school: student.school,
      schoolId: student.schoolId,
      standard: student.standard,
      totalAssessments: studentAssessments.length,
      averageScore: intelligence.averageScore,
      averageAccuracy: intelligence.averageAccuracy,
      riskScore: intelligence.riskScore,
      riskLevel: intelligence.riskLevel,
      reasons: intelligence.riskReasons,
      interventions: intelligence.interventions,
      recommendedDifficulty: intelligence.recommendedDifficulty,
      daysSinceLastAssessment: intelligence.daysSinceLastAssessment,
      trend: intelligence.trend
    };
  });

  rows.sort((a, b) => b.riskScore - a.riskScore || a.averageScore - b.averageScore);

  const riskBuckets = rows.reduce((accumulator, row) => {
    accumulator[row.riskLevel] += 1;
    return accumulator;
  }, { low: 0, medium: 0, high: 0 });

  return {
    summary: {
      totalStudents: rows.length,
      averageRiskScore: rows.length > 0 ? Math.round((rows.reduce((sum, row) => sum + row.riskScore, 0) / rows.length) * 100) / 100 : 0,
      highRiskCount: riskBuckets.high,
      mediumRiskCount: riskBuckets.medium,
      lowRiskCount: riskBuckets.low,
      totalAssessments: assessments.length
    },
    riskBuckets,
    interventionTargets: rows.slice(0, 8),
    allStudents: rows
  };
}

function buildMasteryMap(student, assessments) {
  const orderedAssessments = [...assessments].sort((a, b) => getAssessmentTimestamp(a) - getAssessmentTimestamp(b));
  const topicStats = buildTopicStats(orderedAssessments);

  const nodes = topicStats.map((topic, index) => {
    const mastery = Math.max(0, Math.min(100, Math.round((topic.avgScore * 0.7) + (topic.avgAccuracy * 0.3))));
    const lastSeenDays = topic.latestAt ? getDaysSince(topic.latestAt) : null;

    return {
      id: `skill-${topic.subject}-${index}`,
      topic: topic.subject,
      label: `${topic.label} Mastery`,
      mastery,
      confidence: Math.min(100, Math.round((topic.count / 6) * 100)),
      attempts: topic.count,
      avgScore: topic.avgScore,
      avgAccuracy: topic.avgAccuracy,
      status: mastery >= 85 ? 'mastered' : mastery >= 60 ? 'developing' : 'needs-support',
      lastSeenDays
    };
  });

  const fallbackNodes = [
    { id: 'skill-baseline-reading', topic: 'reading', label: 'Reading Fluency', mastery: 0, confidence: 0, attempts: 0, avgScore: 0, avgAccuracy: 0, status: 'not-started', lastSeenDays: null },
    { id: 'skill-baseline-accuracy', topic: 'accuracy', label: 'Accuracy Control', mastery: 0, confidence: 0, attempts: 0, avgScore: 0, avgAccuracy: 0, status: 'not-started', lastSeenDays: null },
    { id: 'skill-baseline-comprehension', topic: 'comprehension', label: 'Comprehension Recall', mastery: 0, confidence: 0, attempts: 0, avgScore: 0, avgAccuracy: 0, status: 'not-started', lastSeenDays: null }
  ];

  const graphNodes = nodes.length > 0 ? nodes : fallbackNodes;
  const edges = graphNodes.slice(1).map((node, index) => ({
    from: graphNodes[index].id,
    to: node.id,
    type: 'prerequisite'
  }));

  const weakestNode = [...graphNodes].sort((a, b) => a.mastery - b.mastery)[0] || null;
  const strongestNode = [...graphNodes].sort((a, b) => b.mastery - a.mastery)[0] || null;

  return {
    summary: {
      totalSkills: graphNodes.length,
      masteredSkills: graphNodes.filter((node) => node.status === 'mastered').length,
      developingSkills: graphNodes.filter((node) => node.status === 'developing').length,
      supportSkills: graphNodes.filter((node) => node.status === 'needs-support').length,
      averageMastery: graphNodes.length > 0
        ? Math.round(graphNodes.reduce((sum, node) => sum + node.mastery, 0) / graphNodes.length)
        : 0
    },
    weakestNode,
    strongestNode,
    nodes: graphNodes,
    edges
  };
}

function buildPracticeGenerator(student, assessments) {
  const intelligence = buildAdaptiveIntelligence(student, assessments);
  const target = intelligence.weaknesses[0] || intelligence.strengths[0] || { subject: 'general', label: 'general practice', avgScore: intelligence.averageScore };
  const difficulty = intelligence.recommendedDifficulty;

  const templates = {
    EASY: [
      'Read the sentence aloud twice and identify 3 key words.',
      'Answer 4 short prompts focused on {topic}.',
      'Do one untimed recap question and explain your answer.',
      'Practice one hint-enabled question and one without hints.'
    ],
    MEDIUM: [
      'Solve 5 mixed questions from {topic} without hints.',
      'Do one 3-minute speed round and check accuracy.',
      'Summarize the main idea of a {topic} passage in one line.',
      'Retake one missed question and explain the correction.'
    ],
    HARD: [
      'Complete 6 challenge questions from {topic} at timed pace.',
      'Perform a no-hint accuracy sprint and review mistakes.',
      'Blend {topic} with a strength area for transfer learning.',
      'Run a confidence check assessment and compare trend.'
    ]
  };

  const questionSet = (templates[difficulty] || templates.MEDIUM).map((template, index) => ({
    id: `practice-${index + 1}`,
    prompt: template.replace('{topic}', target.label),
    skillTag: target.subject,
    estimatedMinutes: index < 2 ? 4 : 6,
    difficulty
  }));

  return {
    targetSkill: target,
    recommendedDifficulty: difficulty,
    rationale: `Generated from your weakest area (${target.label}) and current trend (${intelligence.trend}).`,
    nextSessionMinutes: questionSet.reduce((sum, item) => sum + item.estimatedMinutes, 0),
    questionSet,
    completionSignal: intelligence.trend === 'declining'
      ? 'Finish this practice today and retake tomorrow.'
      : 'Finish this practice set and reassess within 48 hours.'
  };
}

function buildInterventionCopilot(student, assessments) {
  const intelligence = buildAdaptiveIntelligence(student, assessments);

  const owner = intelligence.riskLevel === 'high'
    ? 'teacher+parent'
    : intelligence.riskLevel === 'medium'
      ? 'teacher'
      : 'student';

  const actionPlan = intelligence.interventions.slice(0, 3).map((step, index) => ({
    id: `intervention-${index + 1}`,
    owner,
    action: step,
    dueInDays: index === 0 ? 1 : index === 1 ? 3 : 7,
    priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'normal'
  }));

  return {
    urgency: intelligence.riskLevel,
    summary: intelligence.riskLevel === 'high'
      ? 'Immediate support recommended. Coordinate with teacher and parent in the next 24 hours.'
      : intelligence.riskLevel === 'medium'
        ? 'Guided intervention recommended this week to prevent performance drop.'
        : 'Student is stable. Keep reinforcement actions active.' ,
    stakeholderMessage: `Student ${student.name} currently has ${intelligence.riskLevel} risk with score ${intelligence.riskScore}/100.`,
    triggers: intelligence.riskReasons,
    actionPlan,
    expectedOutcome: intelligence.riskLevel === 'high'
      ? 'Stabilize trend and reduce risk by 15-20 points in 2 weeks.'
      : intelligence.riskLevel === 'medium'
        ? 'Improve consistency and reduce risk by 8-12 points in 2 weeks.'
        : 'Maintain growth trajectory and push mastery in weakest topic.'
  };
}

function getDateOnly(dateValue = new Date()) {
  return new Date(dateValue).toISOString().split('T')[0];
}

function getYesterdayDateOnly(dateValue = new Date()) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() - 1);
  return getDateOnly(date);
}

function addBadgeIfEligible(student, earnedBadges, key, title, description, condition) {
  if (!condition) return;
  const alreadyHas = (student.badges || []).some((badge) => badge.key === key);
  if (alreadyHas) return;

  const badge = {
    key,
    title,
    description,
    earnedAt: new Date()
  };

  student.badges = [...(student.badges || []), badge];
  earnedBadges.push(badge);
}

async function updateStudentGamification(studentId, assessmentDoc) {
  const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } });
  if (!student) {
    return {
      pointsEarned: 0,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
      newBadges: [],
      certificatesEarned: 0
    };
  }

  const accuracy = typeof assessmentDoc.accuracy === 'number'
    ? assessmentDoc.accuracy
    : (assessmentDoc.totalCount > 0 ? (assessmentDoc.correctCount / assessmentDoc.totalCount) * 100 : 0);
  const basePoints = (assessmentDoc.correctCount || 0) * 10;
  const scoreBonus = accuracy >= 90 ? 20 : accuracy >= 80 ? 10 : 0;
  const streakBonus = student.currentStreak >= 7 ? 10 : 0;
  const pointsEarned = basePoints + scoreBonus + streakBonus;

  const today = getDateOnly();
  const yesterday = getYesterdayDateOnly();

  let updatedStreak = student.currentStreak || 0;
  if (student.lastPracticeDate === today) {
    // Same-day practice should not increment streak repeatedly.
    updatedStreak = student.currentStreak || 1;
  } else if (student.lastPracticeDate === yesterday) {
    updatedStreak = (student.currentStreak || 0) + 1;
  } else {
    updatedStreak = 1;
  }

  student.currentStreak = updatedStreak;
  student.longestStreak = Math.max(student.longestStreak || 0, updatedStreak);
  student.lastPracticeDate = today;
  student.totalPoints = (student.totalPoints || 0) + pointsEarned;

  const totalAssessments = await Assessment.countDocuments({
    $or: [
      { studentId: String(student._id) },
      { studentName: student.name, standard: student.standard }
    ]
  });

  const earnedBadges = [];
  addBadgeIfEligible(student, earnedBadges, 'first_assessment', 'First Step', 'Completed your first assessment', totalAssessments >= 1);
  addBadgeIfEligible(student, earnedBadges, 'consistent_5', 'Consistent Learner', 'Completed 5 assessments', totalAssessments >= 5);
  addBadgeIfEligible(student, earnedBadges, 'master_10', 'Practice Master', 'Completed 10 assessments', totalAssessments >= 10);
  addBadgeIfEligible(student, earnedBadges, 'point_100', 'Point Collector', 'Earned 100 points', (student.totalPoints || 0) >= 100);
  addBadgeIfEligible(student, earnedBadges, 'point_500', 'Point Champion', 'Earned 500 points', (student.totalPoints || 0) >= 500);
  addBadgeIfEligible(student, earnedBadges, 'streak_3', '3-Day Streak', 'Practiced for 3 consecutive days', (student.currentStreak || 0) >= 3);
  addBadgeIfEligible(student, earnedBadges, 'streak_7', '7-Day Streak', 'Practiced for 7 consecutive days', (student.currentStreak || 0) >= 7);
  addBadgeIfEligible(student, earnedBadges, 'high_score_90', 'High Scorer', 'Scored 90% or higher', (assessmentDoc.score || 0) >= 90);

  const certificates = [
    totalAssessments >= 5,
    totalAssessments >= 15,
    (student.totalPoints || 0) >= 1000
  ];
  student.certificatesEarned = certificates.filter(Boolean).length;

  await student.save();

  return {
    pointsEarned,
    totalPoints: student.totalPoints || 0,
    currentStreak: student.currentStreak || 0,
    longestStreak: student.longestStreak || 0,
    badges: student.badges || [],
    newBadges: earnedBadges,
    certificatesEarned: student.certificatesEarned || 0,
    totalAssessments
  };
}

/**
 * Create an audit log entry for admin actions
 * @param {string} adminId - MongoDB ObjectId of the admin
 * @param {string} adminName - Name or username of the admin
 * @param {string} adminRole - Role of the admin (system_admin or school_admin)
 * @param {string} action - Action performed (e.g., 'STUDENT_DELETED', 'EDIT_REQUEST_APPROVED')
 * @param {string} targetType - Type of target entity (e.g., 'Student', 'EditRequest')
 * @param {string} targetId - MongoDB ObjectId of the target entity
 * @param {string} targetName - Name of the target entity
 * @param {Object} details - Additional details about the action
 * @param {string|null} ipAddress - IP address of the admin
 * @returns {Promise<void>}
 */
async function createAuditLog(adminId, adminName, adminRole, action, targetType, targetId, targetName, details = {}, ipAddress = null) {
  try {
    const auditLog = new AuditLog({
      adminId,
      adminName,
      adminRole,
      action,
      targetType,
      targetId,
      targetName,
      details,
      ipAddress
    });
    await auditLog.save();
    console.log(`\u2713 Audit log created: ${action} by ${adminName}`);
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', message: 'Server is running' });
});

// Get all schools
app.get('/api/schools', async (req, res) => {
  try {
    const schools = await School.find().select('_id name address city state hasAdmin').sort({ name: 1 });
    res.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new school (system admin only)
app.post('/api/schools', verifyToken, verifySystemAdmin, validateSchool, async (req, res) => {
  try {
    const { name, address, city, state } = req.body;

    const existingSchool = await School.findOne({ name });
    if (existingSchool) {
      return res.status(400).json({ error: 'School already exists' });
    }

    const school = new School({ name, address, city, state });
    await school.save();
    console.log('✓ School added:', name);

    res.status(201).json({
      message: 'School added successfully',
      school: school
    });
  } catch (error) {
    console.error('Error adding school:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin registration
app.post('/api/admin/register', authLimiter, validateAdminRegistration, async (req, res) => {
  try {
    const { name, email, username, password, role, schoolId } = req.body;

    // Check if username or email exists
    const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existingAdmin) {
      return res.status(400).json({ 
        error: 'Username or email already exists',
        code: 'DUPLICATE_ADMIN'
      });
    }

    // If school admin, check if school already has admin
    if (role === 'school_admin') {
      if (!schoolId) {
        return res.status(400).json({ 
          error: 'School ID required for school admin',
          code: 'SCHOOL_ID_REQUIRED'
        });
      }

      const school = await School.findById(schoolId);
      if (!school) {
        return res.status(400).json({ 
          error: 'School not found',
          code: 'SCHOOL_NOT_FOUND'
        });
      }

      if (school.hasAdmin) {
        return res.status(400).json({ 
          error: 'This school already has an admin',
          code: 'SCHOOL_HAS_ADMIN'
        });
      }
    }

    // Check if system admin already exists
    if (role === 'system_admin') {
      const existingSystemAdmin = await Admin.findOne({ role: 'system_admin' });
      if (existingSystemAdmin) {
        return res.status(400).json({ 
          error: 'System admin already exists',
          code: 'SYSTEM_ADMIN_EXISTS'
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({
      name,
      email,
      username,
      password: hashedPassword,
      role,
      schoolId: role === 'school_admin' ? schoolId : null,
      schoolName: role === 'school_admin' ? (await School.findById(schoolId)).name : null
    });

    await admin.save();

    // Update school if school admin
    if (role === 'school_admin') {
      await School.findByIdAndUpdate(schoolId, {
        hasAdmin: true,
        adminId: admin._id
      });
    }

    // Generate JWT token
    const token = generateToken(admin, 'admin');

    console.log('✓ Admin registered:', name, '-', role);

    res.status(201).json({
      message: 'Admin registration successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        username: admin.username,
        role: admin.role,
        schoolId: admin.schoolId,
        schoolName: admin.schoolName
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'SERVER_ERROR'
    });
  }
});

// Admin login
app.post('/api/admin/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate JWT token
    const token = generateToken(admin, 'admin');

    res.json({
      message: 'Login successful',
      token,
      userType: 'admin',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        username: admin.username,
        role: admin.role,
        schoolId: admin.schoolId,
        schoolName: admin.schoolName
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'SERVER_ERROR'
    });
  }
});

// Register student
app.post('/api/register', authLimiter, validateStudentRegistration, async (req, res) => {
  try {
    const { name, rollno, school, schoolId, std, age, email, phone, username, password } = req.body;

    // Check if username exists
    const existingStudent = await Student.findOne({ username });
    if (existingStudent) {
      return res.status(400).json({ 
        error: 'Username already exists',
        code: 'USERNAME_EXISTS'
      });
    }

    // Verify school exists
    if (schoolId) {
      const schoolExists = await School.findById(schoolId);
      if (!schoolExists) {
        return res.status(400).json({ 
          error: 'Invalid school selected',
          code: 'INVALID_SCHOOL'
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new student
    const student = new Student({
      name,
      rollno,
      school,
      schoolId,
      standard: std,
      age,
      email,
      phone,
      username,
      password: hashedPassword
    });

    await student.save();
    
    // Generate JWT token
    const token = generateToken(student, 'student');
    
    console.log('✓ Student registered:', name);

    res.status(201).json({
      message: 'Registration successful',
      token,
      studentId: student._id,
      student: {
        id: student._id,
        name: student.name,
        rollno: student.rollno,
        school: student.school,
        schoolId: student.schoolId,
        standard: student.standard,
        age: student.age,
        username: student.username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'SERVER_ERROR'
    });
  }
});

// Login student
app.post('/api/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    const student = await Student.findOne({ username });
    if (!student) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, student.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate JWT token
    const token = generateToken(student, 'student');

    res.json({
      message: 'Login successful',
      token,
      userType: 'student',
      student: {
        id: student._id,
        name: student.name,
        rollno: student.rollno,
        school: student.school,
        schoolId: student.schoolId,
        standard: student.standard,
        age: student.age,
        username: student.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'SERVER_ERROR'
    });
  }
});

// Submit assessment with audio
app.post('/api/assess', verifyToken, verifyStudent, upload.single('audio'), validateAssessment, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { expected_words, student_id, student_name, standard, language, time_spent_seconds, hints_used, bookmarked_count } = req.body;
    const expectedWords = JSON.parse(expected_words);
    const audioPath = req.file.path;
    const assessmentLanguage = language || 'english';

    console.log(`✓ Processing ${assessmentLanguage} assessment for:`, student_name);

    // Call Python Whisper service
    const FormData = require('form-data');
    const formData = new FormData();

    formData.append('audio', fs.createReadStream(audioPath));
    formData.append('expected_words', JSON.stringify(expectedWords));
    formData.append('language', assessmentLanguage);

    let assessmentResult;
    try {
      // Call Python Whisper service
      const whisperServiceUrl = process.env.WHISPER_SERVICE_URL || 'http://localhost:5001';
      let response;
      try {
        response = await axios.post(`${whisperServiceUrl}/transcribe`, formData, {
          headers: formData.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 180000
        });
      } catch (firstError) {
        const retryable = ['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT', 'EPIPE'];
        if (retryable.includes(firstError.code)) {
          console.warn(`⚠ Whisper transient error (${firstError.code}), retrying once...`);
          await sleep(500);
          response = await axios.post(`${whisperServiceUrl}/transcribe`, formData, {
            headers: formData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 180000
          });
        } else {
          throw firstError;
        }
      }
      assessmentResult = response.data;
      console.log('✓ Whisper transcription successful');
    } catch (error) {
      console.error('✗ Whisper service error:', error.message);
      const upstreamMessage = error.response?.data?.error || error.response?.data?.message;
      return res.status(502).json({
        error: upstreamMessage || `Whisper request failed: ${error.code || error.message}`
      });
    }

    // Save assessment to database
    const assessment = new Assessment({
      studentId: student_id,
      studentName: student_name,
      standard: standard,
      language: assessmentLanguage,
      assessmentType: 'standard',
      score: assessmentResult.score,
      correctCount: assessmentResult.correct_count,
      totalCount: assessmentResult.total_count,
      accuracy: assessmentResult.total_count > 0 ? (assessmentResult.correct_count / assessmentResult.total_count) * 100 : 0,
      durationSeconds: time_spent_seconds ? Number(time_spent_seconds) : undefined,
      hintsUsed: hints_used ? Number(hints_used) : 0,
      bookmarkedCount: bookmarked_count ? Number(bookmarked_count) : 0,
      transcribedText: assessmentResult.transcribed_text,
      details: assessmentResult.details,
      expectedWords: expectedWords,
      date: new Date().toISOString().split('T')[0]
    });

    await assessment.save();
    console.log('✓ Assessment saved for:', student_name);

    const gamification = await updateStudentGamification(student_id, assessment);

    // Clean up uploaded file
    fs.unlinkSync(audioPath);

    res.json({
      ...assessmentResult,
      gamification
    });
  } catch (error) {
    console.error('Assessment error:', error);
    res.status(500).json({ error: error.message });
  }
});

 // Get student assessment history (with pagination)
app.get('/api/student/:studentId/history', verifyToken, verifyOwnData, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const totalCount = await Assessment.countDocuments({
      studentId: req.params.studentId
    });
    
    const assessments = await Assessment.find({
      studentId: req.params.studentId
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip);

    res.json({
      assessments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get overall statistics
app.get('/api/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalAssessments = await Assessment.countDocuments();

    const avgResult = await Assessment.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]);

    const avgScore = avgResult.length > 0 ? avgResult[0].avgScore.toFixed(2) : 0;

    res.json({
      totalStudents,
      totalAssessments,
      averageScore: parseFloat(avgScore)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Comprehension assessment endpoint
app.post('/api/assess-comprehension', verifyToken, verifyStudent, upload.fields([
  { name: 'paragraph_audio', maxCount: 1 },
  { name: 'questions_audio', maxCount: 1 },
  { name: 'answer_audio_0', maxCount: 1 },
  { name: 'answer_audio_1', maxCount: 1 },
  { name: 'answer_audio_2', maxCount: 1 },
  { name: 'answer_audio_3', maxCount: 1 },
  { name: 'answer_audio_4', maxCount: 1 },
  { name: 'answer_audio_5', maxCount: 1 },
  { name: 'answer_audio_6', maxCount: 1 },
  { name: 'answer_audio_7', maxCount: 1 },
  { name: 'answer_audio_8', maxCount: 1 },
  { name: 'answer_audio_9', maxCount: 1 }
]), async (req, res) => {
  try {
    const { expected_paragraph, expected_questions, expected_answers, student_id, student_name, standard, language, time_spent_seconds, hints_used, bookmarked_count } = req.body;
    const assessmentLanguage = language || 'english';

    console.log('✓ Processing comprehension assessment for:', student_name);

    // Prepare form data for Python service
    const FormData = require('form-data');
    const formData = new FormData();

    // Add audio files
    if (req.files['paragraph_audio']) {
      formData.append('paragraph_audio', fs.createReadStream(req.files['paragraph_audio'][0].path));
    }
    if (req.files['questions_audio']) {
      formData.append('questions_audio', fs.createReadStream(req.files['questions_audio'][0].path));
    }

    // Add answer audios (support up to 10 questions)
    for (let i = 0; i < 10; i++) {
      if (req.files[`answer_audio_${i}`]) {
        formData.append(`answer_audio_${i}`, fs.createReadStream(req.files[`answer_audio_${i}`][0].path));
      }
    }

    // Add expected content
    formData.append('expected_paragraph', expected_paragraph);
    formData.append('expected_questions', expected_questions);
    formData.append('expected_answers', expected_answers);

    let assessmentResult;
    try {
      // Call Python Whisper service
      const whisperServiceUrl = process.env.WHISPER_SERVICE_URL || 'http://localhost:5001';
      let response;
      try {
        response = await axios.post(`${whisperServiceUrl}/assess-comprehension`, formData, {
          headers: formData.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 300000
        });
      } catch (firstError) {
        const retryable = ['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT', 'EPIPE'];
        if (retryable.includes(firstError.code)) {
          console.warn(`⚠ Whisper transient error (${firstError.code}) on comprehension, retrying once...`);
          await sleep(500);
          response = await axios.post(`${whisperServiceUrl}/assess-comprehension`, formData, {
            headers: formData.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 300000
          });
        } else {
          throw firstError;
        }
      }
      assessmentResult = response.data;
      console.log('✓ Comprehension assessment completed');
      console.log(`  Paragraph score: ${assessmentResult.paragraph_score}%`);
      console.log(`  Answers correct: ${assessmentResult.correct_answers}/${assessmentResult.total_questions}`);
      console.log(`  Combined score: ${assessmentResult.combined_score}%`);
    } catch (error) {
      console.error('✗ Whisper service error:', error.message);

      // Clean up uploaded files
      Object.values(req.files).flat().forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });

      const upstreamMessage = error.response?.data?.error || error.response?.data?.message;
      return res.status(502).json({
        error: upstreamMessage || `Whisper request failed: ${error.code || error.message}`
      });
    }

    // Save comprehensive assessment to database
    const assessment = new Assessment({
      studentId: student_id,
      studentName: student_name,
      standard: standard,
      language: assessmentLanguage,
      assessmentType: 'comprehension',
      score: assessmentResult.combined_score,
      correctCount: assessmentResult.correct_answers,
      totalCount: assessmentResult.total_questions,
      accuracy: assessmentResult.total_questions > 0 ? (assessmentResult.correct_answers / assessmentResult.total_questions) * 100 : 0,
      durationSeconds: time_spent_seconds ? Number(time_spent_seconds) : undefined,
      hintsUsed: hints_used ? Number(hints_used) : 0,
      bookmarkedCount: bookmarked_count ? Number(bookmarked_count) : 0,
      transcribedText: assessmentResult.paragraph_transcribed,
      details: assessmentResult.answer_details,
      expectedWords: JSON.parse(expected_answers),
      date: new Date().toISOString().split('T')[0],
      // Additional comprehension-specific fields
      paragraphScore: assessmentResult.paragraph_score,
      answersScore: assessmentResult.answers_score
    });

    await assessment.save();
    console.log('✓ Comprehension assessment saved for:', student_name);

    const gamification = await updateStudentGamification(student_id, assessment);

    // Clean up uploaded files
    Object.values(req.files).flat().forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    res.json({
      ...assessmentResult,
      gamification
    });
  } catch (error) {
    console.error('Comprehension assessment error:', error);

    // Clean up uploaded files on error
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({ error: error.message });
  }
});

// Get student dashboard data
app.get('/api/student-dashboard/:studentId', verifyToken, verifyOwnData, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Get student info
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get student's assessments
    const assessments = await Assessment.find({
      $or: [
        { studentId: String(student._id) },
        { studentName: student.name, standard: student.standard }
      ]
    }).sort({ timestamp: -1 });

    res.json({
      student: {
        id: student._id,
        name: student.name,
        rollno: student.rollno,
        school: student.school,
        schoolId: student.schoolId,
        standard: student.standard,
        age: student.age,
        email: student.email,
        phone: student.phone,
        username: student.username
      },
      assessments: assessments
    });
  } catch (error) {
    console.error('Error fetching student dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get personalized learning intelligence for a student
app.get('/api/intelligence/student/:studentId', verifyToken, verifyOwnData, async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const assessments = await Assessment.find({
      $or: [
        { studentId: String(student._id) },
        { studentName: student.name, standard: student.standard }
      ]
    }).sort({ timestamp: 1 });

    const intelligence = buildAdaptiveIntelligence(student, assessments);
    const llmCoach = await buildLlmLearningCoach(student, intelligence);
    const fallbackCoach = {
      summary: intelligence.coachSummary,
      nextActions: intelligence.coachNextActions,
      encouragement: intelligence.trend === 'improving'
        ? 'You are moving in the right direction. Keep the rhythm.'
        : intelligence.trend === 'declining'
          ? 'A short reset will help. Focus on one topic at a time.'
          : 'Consistency will turn this into a strong pattern.',
      source: 'rules'
    };
    const learningCoach = llmCoach || fallbackCoach;

    res.json({
      studentId: String(student._id),
      studentName: student.name,
      schoolId: student.schoolId,
      schoolName: student.school,
      standard: student.standard,
      adaptiveScheduler: {
        recommendedDifficulty: intelligence.recommendedDifficulty,
        focusAreas: intelligence.weaknesses,
        weeklyPlan: intelligence.weeklyPlan,
        nextReviewWindowDays: intelligence.daysSinceLastAssessment !== null ? Math.max(1, Math.min(7, intelligence.daysSinceLastAssessment + 1)) : 1
      },
      learningCoach: {
        summary: learningCoach.summary,
        nextActions: learningCoach.nextActions,
        encouragement: learningCoach.encouragement,
        source: learningCoach.source,
        model: llmCoach ? llmCoach.model : null
      },
      riskProfile: {
        score: intelligence.riskScore,
        level: intelligence.riskLevel,
        reasons: intelligence.riskReasons,
        interventions: intelligence.interventions,
        daysSinceLastAssessment: intelligence.daysSinceLastAssessment,
        trend: intelligence.trend
      },
      insights: {
        totalAssessments: assessments.length,
        strengths: intelligence.strengths,
        weaknesses: intelligence.weaknesses,
        averageScore: intelligence.averageScore,
        averageAccuracy: intelligence.averageAccuracy,
        latestAssessmentAt: intelligence.latestAssessment ? intelligence.latestAssessment.timestamp : null
      }
    });
  } catch (error) {
    console.error('Error fetching student intelligence:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get mastery map for a student
app.get('/api/mastery-map/student/:studentId', verifyToken, verifyOwnData, async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const assessments = await Assessment.find({
      $or: [
        { studentId: String(student._id) },
        { studentName: student.name, standard: student.standard }
      ]
    }).sort({ timestamp: 1 });

    const masteryMap = buildMasteryMap(student, assessments);
    res.json({
      studentId: String(student._id),
      studentName: student.name,
      ...masteryMap
    });
  } catch (error) {
    console.error('Error fetching mastery map:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get personalized practice generator for a student
app.get('/api/practice-generator/student/:studentId', verifyToken, verifyOwnData, async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const assessments = await Assessment.find({
      $or: [
        { studentId: String(student._id) },
        { studentName: student.name, standard: student.standard }
      ]
    }).sort({ timestamp: 1 });

    const practice = buildPracticeGenerator(student, assessments);
    res.json({
      studentId: String(student._id),
      studentName: student.name,
      ...practice
    });
  } catch (error) {
    console.error('Error fetching practice generator:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get intervention copilot plan for a student
app.get('/api/intervention-copilot/student/:studentId', verifyToken, verifyOwnData, async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const assessments = await Assessment.find({
      $or: [
        { studentId: String(student._id) },
        { studentName: student.name, standard: student.standard }
      ]
    }).sort({ timestamp: 1 });

    const intervention = buildInterventionCopilot(student, assessments);
    res.json({
      studentId: String(student._id),
      studentName: student.name,
      ...intervention
    });
  } catch (error) {
    console.error('Error fetching intervention copilot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get intervention copilot roster for admins
app.get('/api/intervention-copilot/admin', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const isSystemAdmin = req.user?.role === 'system_admin';
    const requestedSchoolId = req.query.schoolId || null;
    const scopeSchoolId = isSystemAdmin ? requestedSchoolId : (req.user?.schoolId || null);

    const studentFilter = { isDeleted: { $ne: true } };
    if (scopeSchoolId) {
      studentFilter.schoolId = scopeSchoolId;
    }

    const students = await Student.find(studentFilter)
      .select('_id name school schoolId standard age username currentStreak lastPracticeDate')
      .sort({ name: 1 });

    const studentIds = students.map((student) => String(student._id));
    const assessments = studentIds.length > 0
      ? await Assessment.find({ studentId: { $in: studentIds } }).sort({ timestamp: 1 })
      : [];

    const assessmentMap = assessments.reduce((accumulator, assessment) => {
      const key = String(assessment.studentId);
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(assessment);
      return accumulator;
    }, {});

    const roster = students.map((student) => {
      const plan = buildInterventionCopilot(student, assessmentMap[String(student._id)] || []);
      return {
        studentId: String(student._id),
        name: student.name,
        standard: student.standard,
        urgency: plan.urgency,
        summary: plan.summary,
        topAction: plan.actionPlan[0] || null,
        expectedOutcome: plan.expectedOutcome
      };
    }).sort((a, b) => {
      const weight = { high: 3, medium: 2, low: 1 };
      return (weight[b.urgency] || 0) - (weight[a.urgency] || 0);
    });

    res.json({
      scope: {
        type: isSystemAdmin ? 'system' : 'school',
        schoolId: scopeSchoolId
      },
      totalStudents: roster.length,
      highUrgency: roster.filter((item) => item.urgency === 'high').length,
      mediumUrgency: roster.filter((item) => item.urgency === 'medium').length,
      lowUrgency: roster.filter((item) => item.urgency === 'low').length,
      roster: roster.slice(0, 12)
    });
  } catch (error) {
    console.error('Error fetching admin intervention copilot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all students (with optional school filter and pagination)
app.get('/api/students', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { schoolId, page = 1, limit = 20 } = req.query;
    const filter = schoolId
      ? { schoolId, isDeleted: { $ne: true } }
      : { isDeleted: { $ne: true } };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const totalCount = await Student.countDocuments(filter);
    
    const students = await Student.find(filter)
      .select('_id name rollno school schoolId standard age email phone username')
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    res.json({
      students,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific student by ID
app.get('/api/students/:studentId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await Student.findById(studentId)
      .select('_id name rollno school schoolId standard age email phone username registeredAt');
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Get student's assessments
    const assessments = await Assessment.find({
      studentName: student.name
    }).sort({ date: -1 }).limit(10);
    
    res.json({
      ...student.toObject(),
      assessments: assessments
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete student by ID
app.delete('/api/students/:studentId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await Student.findById(studentId);
    if (!student || student.isDeleted) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Soft delete student
    student.isDeleted = true;
    await student.save();
    
    // Create audit log
    await createAuditLog(
      req.user.id,
      req.user.username || 'Admin',
      req.user.role,
      'STUDENT_DELETED',
      'Student',
      studentId,
      student.name,
      { schoolId: student.schoolId, standard: student.standard },
      req.ip
    );
    
    console.log('✓ Student deleted (soft):', student.name);
    
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all admins (system admin only)
app.get('/api/admins', verifyToken, verifySystemAdmin, async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('_id name email username role schoolId schoolName')
      .sort({ name: 1 });
    
    res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete admin by ID (system admin only)
app.delete('/api/admins/:adminId', verifyToken, verifySystemAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;
    
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    // If school admin, update the school
    if (admin.role === 'school_admin' && admin.schoolId) {
      await School.findByIdAndUpdate(admin.schoolId, {
        hasAdmin: false,
        adminId: null
      });
    }
    
    // Delete admin
    await Admin.findByIdAndDelete(adminId);
    
    console.log('✓ Admin deleted:', admin.name);
    
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all assessments (with optional school filter)
app.get('/api/assessments', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { schoolId } = req.query;
    let assessments;
    
    if (schoolId) {
      // Get all students from this school
      const students = await Student.find({ schoolId }).select('name');
      const studentNames = students.map(s => s.name);
      
      // Get assessments for these students
      assessments = await Assessment.find({
        studentName: { $in: studentNames }
      }).sort({ date: -1 });
    } else {
      // Get all assessments
      assessments = await Assessment.find().sort({ date: -1 });
    }
    
    res.json(assessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get school-specific statistics
app.get('/api/school-stats/:schoolId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    // Get all students from this school
    const students = await Student.find({ schoolId });
    const totalStudents = students.length;
    const studentNames = students.map(s => s.name);
    
    // Get assessments for these students
    const assessments = await Assessment.find({
      studentName: { $in: studentNames }
    });
    

  // Get risk and intervention intelligence for admins
  app.get('/api/intelligence/admin', verifyToken, verifyAdmin, async (req, res) => {
    try {
      const isSystemAdmin = req.user?.role === 'system_admin';
      const requestedSchoolId = req.query.schoolId || null;
      const scopeSchoolId = isSystemAdmin ? requestedSchoolId : (req.user?.schoolId || null);

      const studentFilter = { isDeleted: { $ne: true } };
      if (scopeSchoolId) {
        studentFilter.schoolId = scopeSchoolId;
      }

      const students = await Student.find(studentFilter)
        .select('_id name school schoolId standard age username currentStreak lastPracticeDate')
        .sort({ name: 1 });

      const studentIds = students.map((student) => String(student._id));
      const assessments = studentIds.length > 0
        ? await Assessment.find({ studentId: { $in: studentIds } }).sort({ timestamp: 1 })
        : [];

      const overview = buildAdminRiskOverview(students, assessments);
      const school = scopeSchoolId
        ? await School.findById(scopeSchoolId).select('_id name city state')
        : null;

      res.json({
        scope: {
          type: isSystemAdmin ? 'system' : 'school',
          schoolId: scopeSchoolId,
          schoolName: school?.name || (isSystemAdmin ? 'All Schools' : req.user?.schoolName || 'School')
        },
        summary: overview.summary,
        riskBuckets: overview.riskBuckets,
        interventionTargets: overview.interventionTargets,
        topRiskStudent: overview.interventionTargets[0] || null,
        coachSignals: overview.interventionTargets.slice(0, 3).map((student) => ({
          studentId: student.studentId,
          name: student.name,
          signal: student.reasons[0] || 'Monitor progress this week.',
          nextStep: student.interventions[0] || 'Keep practicing.'
        }))
      });
    } catch (error) {
      console.error('Error fetching admin intelligence:', error);
      res.status(500).json({ error: error.message });
    }
  });
    const totalAssessments = assessments.length;
    
    const avgResult = assessments.length > 0
      ? assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length
      : 0;
    
    res.json({
      totalStudents,
      totalAssessments,
      averageScore: parseFloat(avgResult.toFixed(2))
    });
  } catch (error) {
    console.error('Error fetching school stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get edit requests (with optional school filter)
app.get('/api/edit-requests', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { schoolId } = req.query;
    let editRequests;
    
    if (schoolId) {
      // Get edit requests for this school directly
      editRequests = await EditRequest.find({
        schoolId: schoolId
      }).sort({ createdAt: -1 });
    } else {
      // Get all edit requests
      editRequests = await EditRequest.find().sort({ createdAt: -1 });
    }
    
    res.json(editRequests);
  } catch (error) {
    console.error('Error fetching edit requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get edit requests for a specific student
app.get('/api/edit-requests/student/:studentId', verifyToken, verifyOwnData, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const editRequests = await EditRequest.find({
      studentId: studentId
    }).sort({ createdAt: -1 });
    
    res.json(editRequests);
  } catch (error) {
    console.error('Error fetching student edit requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit edit request
app.post('/api/edit-requests', verifyToken, verifyStudent, validateEditRequest, async (req, res) => {
  try {
    const { studentId, studentName, schoolId, schoolName, currentData, requestedChanges, reason } = req.body;
    
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const editRequest = new EditRequest({
      studentId,
      studentName: studentName || student.name,
      schoolId: schoolId || student.schoolId,
      schoolName: schoolName || student.school,
      currentData: currentData || {
        name: student.name,
        rollno: student.rollno,
        age: student.age,
        email: student.email,
        phone: student.phone
      },
      requestedChanges: requestedChanges,
      reason,
      status: 'pending'
    });
    
    await editRequest.save();
    console.log('✓ Edit request submitted for:', student.name);
    
    res.status(201).json({
      message: 'Edit request submitted successfully',
      request: editRequest
    });
  } catch (error) {
    console.error('Error submitting edit request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update edit request status (admin only)
app.put('/api/edit-requests/:requestId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, reviewNote, reviewedBy } = req.body;
    
    const editRequest = await EditRequest.findById(requestId);
    if (!editRequest) {
      return res.status(404).json({ error: 'Edit request not found' });
    }
    
    editRequest.status = status;
    editRequest.reviewNote = reviewNote;
    editRequest.reviewedBy = reviewedBy;
    editRequest.reviewDate = new Date();
    
    // If approved, update the student
    if (status === 'approved') {
      await Student.findByIdAndUpdate(
        editRequest.studentId,
        { $set: editRequest.requestedChanges }
      );
      console.log('✓ Student data updated:', editRequest.studentName);
    }
    
    await editRequest.save();
    console.log(`✓ Edit request ${status}:`, editRequest.studentName);
    
    res.json({
      message: `Edit request ${status} successfully`,
      request: editRequest
    });
  } catch (error) {
    console.error('Error updating edit request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PASSWORD RESET ROUTES
// ============================================

/**
 * Request password reset - generates a 6-digit code
 * POST /api/password-reset/request
 */
app.post('/api/password-reset/request', authLimiter, async (req, res) => {
  try {
    const { username, userType } = req.body;
    
    if (!username || !userType) {
      return res.status(400).json({ 
        error: 'Username and user type are required',
        code: 'MISSING_FIELDS'
      });
    }
    
    // Find user based on type
    let user;
    if (userType === 'student') {
      user = await Student.findOne({ username, isDeleted: false });
    } else if (userType === 'admin') {
      user = await Admin.findOne({ username, isDeleted: false });
    } else {
      return res.status(400).json({ 
        error: 'Invalid user type',
        code: 'INVALID_USER_TYPE'
      });
    }
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create password reset token (expires in 15 minutes)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    const passwordReset = new PasswordReset({
      userId: user._id,
      userType,
      username,
      token: resetCode,
      expiresAt
    });
    
    await passwordReset.save();
    
    console.log(`\u2713 Password reset code generated for ${userType}: ${username}`);
    
    // In production, send this code via email instead of returning it
    res.json({
      message: 'Password reset code generated',
      // TODO: Remove this in production - send via email instead
      resetCode, 
      expiresIn: '15 minutes'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * Verify reset code
 * POST /api/password-reset/verify
 */
app.post('/api/password-reset/verify', authLimiter, async (req, res) => {
  try {
    const { username, userType, resetCode } = req.body;
    
    if (!username || !userType || !resetCode) {
      return res.status(400).json({ 
        error: 'All fields are required',
        code: 'MISSING_FIELDS'
      });
    }
    
    const passwordReset = await PasswordReset.findOne({
      username,
      userType,
      token: resetCode,
      used: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!passwordReset) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset code',
        code: 'INVALID_CODE'
      });
    }
    
    res.json({
      message: 'Reset code verified',
      valid: true
    });
  } catch (error) {
    console.error('Code verification error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * Reset password with code
 * POST /api/password-reset/reset
 */
app.post('/api/password-reset/reset', authLimiter, async (req, res) => {
  try {
    const { username, userType, resetCode, newPassword } = req.body;
    
    if (!username || !userType || !resetCode || !newPassword) {
      return res.status(400).json({ 
        error: 'All fields are required',
        code: 'MISSING_FIELDS'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters',
        code: 'PASSWORD_TOO_SHORT'
      });
    }
    
    const passwordReset = await PasswordReset.findOne({
      username,
      userType,
      token: resetCode,
      used: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!passwordReset) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset code',
        code: 'INVALID_CODE'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    if (userType === 'student') {
      await Student.findByIdAndUpdate(passwordReset.userId, {
        password: hashedPassword
      });
    } else {
      await Admin.findByIdAndUpdate(passwordReset.userId, {
        password: hashedPassword
      });
    }
    
    // Mark token as used
    passwordReset.used = true;
    await passwordReset.save();
    
    console.log(`\u2713 Password reset successful for ${userType}: ${username}`);
    
    res.json({
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      error: error.message,
      code: 'SERVER_ERROR'
    });
  }
});

// ============================================
// EXPORT ROUTES
// ============================================

/**
 * Export student assessments to CSV
 * GET /api/export/student/:studentId/assessments
 */
app.get('/api/export/student/:studentId/assessments', verifyToken, verifyOwnData, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const assessments = await Assessment.find({
      $or: [
        { studentId },
        { studentName: student.name, standard: student.standard }
      ]
    })
      .sort({ timestamp: -1 });
    
    // Create CSV content
    const csvHeaders = 'Date,Standard,Language,Score,Accuracy (%),Time Spent (sec),Correct/Total,Transcribed Text\\n';
    const csvRows = assessments.map(a => {
      const date = new Date(a.timestamp).toLocaleDateString();
      const accuracy = typeof a.accuracy === 'number'
        ? a.accuracy.toFixed(2)
        : (a.totalCount > 0 ? ((a.correctCount / a.totalCount) * 100).toFixed(2) : '0.00');
      const duration = typeof a.durationSeconds === 'number' ? a.durationSeconds : '';
      const transcribed = (a.transcribedText || '').replace(/,/g, ';').replace(/\\n/g, ' ');
      return `${date},${a.standard},${a.language},${a.score},${accuracy},${duration},${a.correctCount}/${a.totalCount},"${transcribed}"`;
    }).join('\\n');
    
    const csvContent = csvHeaders + csvRows;
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${student.name}_assessments.csv"`);
    res.send(csvContent);
    
    console.log(`\u2713 Exported assessments for student: ${student.name}`);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export all students to CSV (admin only)
 * GET /api/export/students
 */
app.get('/api/export/students', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { schoolId } = req.query;
    const filter = schoolId
      ? { schoolId, isDeleted: { $ne: true } }
      : { isDeleted: { $ne: true } };
    
    const students = await Student.find(filter)
      .sort({ name: 1 });
    
    // Create CSV content
    const csvHeaders = 'Name,Roll No,School,Standard,Age,Email,Phone,Username,Registered Date\\n';
    const csvRows = students.map(s => {
      const date = new Date(s.registeredAt).toLocaleDateString();
      return `"${s.name}",${s.rollno},"${s.school}",${s.standard},${s.age},"${s.email || ''}","${s.phone || ''}",${s.username},${date}`;
    }).join('\\n');
    
    const csvContent = csvHeaders + csvRows;
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
    res.send(csvContent);
    
    console.log(`\u2713 Exported ${students.length} students`);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get assessment analytics for a student
 * GET /api/analytics/student/:studentId
 */
app.get('/api/analytics/student/:studentId', verifyToken, verifyOwnData, async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findOne({ _id: studentId, isDeleted: false });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const assessments = await Assessment.find({
      $or: [
        { studentId },
        { studentName: student.name, standard: student.standard }
      ]
    })
      .sort({ timestamp: 1 });
    
    if (assessments.length === 0) {
      return res.json({
        totalAssessments: 0,
        averageScore: 0,
        averageAccuracy: 0,
        averageTimeSpentSeconds: 0,
        highestScore: 0,
        lowestScore: 0,
        progressData: [],
        scoreDistribution: {},
        languageBreakdown: {},
        strengths: [],
        weaknesses: [],
        classComparison: {
          classAverageScore: 0,
          classAverageAccuracy: 0,
          classAverageTimeSpentSeconds: 0,
          studentPercentile: 0,
          classSize: 0
        }
      });
    }
    
    // Calculate statistics
    const scores = assessments.map(a => a.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    const accuracies = assessments.map(a => (typeof a.accuracy === 'number' ? a.accuracy : (a.totalCount > 0 ? (a.correctCount / a.totalCount) * 100 : 0)));
    const averageAccuracy = accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length;

    const assessmentsWithTime = assessments.filter(a => typeof a.durationSeconds === 'number' && !Number.isNaN(a.durationSeconds));
    const averageTimeSpentSeconds = assessmentsWithTime.length > 0
      ? assessmentsWithTime.reduce((sum, a) => sum + a.durationSeconds, 0) / assessmentsWithTime.length
      : 0;
    
    // Progress data for charts (last 10 assessments)
    const progressData = assessments.slice(-10).map(a => ({
      date: new Date(a.timestamp).toLocaleDateString(),
      score: a.score,
      standard: a.standard,
      accuracy: typeof a.accuracy === 'number' ? a.accuracy : (a.totalCount > 0 ? (a.correctCount / a.totalCount) * 100 : 0),
      timeSpentSeconds: typeof a.durationSeconds === 'number' ? a.durationSeconds : null
    }));
    
    // Score distribution
    const scoreDistribution = {
      excellent: assessments.filter(a => a.score >= 90).length,
      good: assessments.filter(a => a.score >= 70 && a.score < 90).length,
      average: assessments.filter(a => a.score >= 50 && a.score < 70).length,
      needsImprovement: assessments.filter(a => a.score < 50).length
    };
    
    // Language breakdown
    const languageBreakdown = assessments.reduce((acc, a) => {
      const lang = a.language || 'english';
      if (!acc[lang]) {
        acc[lang] = { count: 0, avgScore: 0, avgAccuracy: 0, totalScore: 0, totalAccuracy: 0 };
      }
      acc[lang].count++;
      acc[lang].totalScore += a.score;
      acc[lang].totalAccuracy += (typeof a.accuracy === 'number' ? a.accuracy : (a.totalCount > 0 ? (a.correctCount / a.totalCount) * 100 : 0));
      acc[lang].avgScore = acc[lang].totalScore / acc[lang].count;
      acc[lang].avgAccuracy = acc[lang].totalAccuracy / acc[lang].count;
      return acc;
    }, {});

    const subjectPerformance = Object.entries(languageBreakdown).map(([subject, value]) => ({
      subject,
      count: value.count,
      avgScore: Math.round(value.avgScore * 100) / 100,
      avgAccuracy: Math.round(value.avgAccuracy * 100) / 100
    }));

    const strengths = [...subjectPerformance]
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 2);
    const weaknesses = [...subjectPerformance]
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 2);

    const classmates = await Student.find({
      schoolId: student.schoolId,
      standard: student.standard,
      isDeleted: { $ne: true }
    }).select('_id');

    const classStudentIds = classmates.map(s => String(s._id));
    const classAssessments = await Assessment.find({ studentId: { $in: classStudentIds } });

    const classAverageScore = classAssessments.length > 0
      ? classAssessments.reduce((sum, a) => sum + a.score, 0) / classAssessments.length
      : 0;
    const classAverageAccuracy = classAssessments.length > 0
      ? classAssessments.reduce((sum, a) => sum + (typeof a.accuracy === 'number' ? a.accuracy : (a.totalCount > 0 ? (a.correctCount / a.totalCount) * 100 : 0)), 0) / classAssessments.length
      : 0;

    const classWithTime = classAssessments.filter(a => typeof a.durationSeconds === 'number' && !Number.isNaN(a.durationSeconds));
    const classAverageTimeSpentSeconds = classWithTime.length > 0
      ? classWithTime.reduce((sum, a) => sum + a.durationSeconds, 0) / classWithTime.length
      : 0;

    const classStudentAverageScores = [];
    for (const classStudentId of classStudentIds) {
      const entries = classAssessments.filter(a => a.studentId === classStudentId);
      if (entries.length > 0) {
        classStudentAverageScores.push(entries.reduce((sum, a) => sum + a.score, 0) / entries.length);
      }
    }
    const lowerOrEqualCount = classStudentAverageScores.filter(value => value <= averageScore).length;
    const studentPercentile = classStudentAverageScores.length > 0
      ? Math.round((lowerOrEqualCount / classStudentAverageScores.length) * 100)
      : 0;
    
    res.json({
      totalAssessments: assessments.length,
      averageScore: Math.round(averageScore * 100) / 100,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      averageTimeSpentSeconds: Math.round(averageTimeSpentSeconds),
      highestScore,
      lowestScore,
      progressData,
      scoreDistribution,
      languageBreakdown,
      strengths,
      weaknesses,
      classComparison: {
        classAverageScore: Math.round(classAverageScore * 100) / 100,
        classAverageAccuracy: Math.round(classAverageAccuracy * 100) / 100,
        classAverageTimeSpentSeconds: Math.round(classAverageTimeSpentSeconds),
        studentPercentile,
        classSize: classmates.length
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get gamification profile for a student
 * GET /api/gamification/student/:studentId
 */
app.get('/api/gamification/student/:studentId', verifyToken, verifyOwnData, async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } })
      .select('name school schoolId standard totalPoints currentStreak longestStreak badges certificatesEarned lastPracticeDate');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const totalAssessments = await Assessment.countDocuments({
      $or: [
        { studentId: String(student._id) },
        { studentName: student.name, standard: student.standard }
      ]
    });

    res.json({
      studentId: String(student._id),
      totalPoints: student.totalPoints || 0,
      currentStreak: student.currentStreak || 0,
      longestStreak: student.longestStreak || 0,
      badges: student.badges || [],
      certificatesEarned: student.certificatesEarned || 0,
      lastPracticeDate: student.lastPracticeDate || null,
      totalAssessments
    });
  } catch (error) {
    console.error('Gamification error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get leaderboard data (class + grade) for a student
 * GET /api/leaderboard/student/:studentId
 */
app.get('/api/leaderboard/student/:studentId', verifyToken, verifyOwnData, async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findOne({ _id: studentId, isDeleted: { $ne: true } })
      .select('_id name schoolId standard totalPoints currentStreak');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const buildLeaderboard = async (studentFilter) => {
      const students = await Student.find({ ...studentFilter, isDeleted: { $ne: true } })
        .select('_id name totalPoints currentStreak standard');

      if (students.length === 0) {
        return { top: [], myRank: null, totalParticipants: 0 };
      }

      const ids = students.map((s) => String(s._id));

      const perf = await Assessment.aggregate([
        { $match: { studentId: { $in: ids } } },
        {
          $group: {
            _id: '$studentId',
            averageScore: { $avg: '$score' },
            assessmentsCount: { $sum: 1 }
          }
        }
      ]);

      const perfMap = new Map(perf.map((p) => [String(p._id), p]));

      const rows = students.map((s) => {
        const p = perfMap.get(String(s._id));
        return {
          studentId: String(s._id),
          name: s.name,
          standard: s.standard,
          totalPoints: s.totalPoints || 0,
          currentStreak: s.currentStreak || 0,
          averageScore: p?.averageScore || 0,
          assessmentsCount: p?.assessmentsCount || 0
        };
      });

      rows.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
        return b.assessmentsCount - a.assessmentsCount;
      });

      const ranked = rows.map((row, index) => ({ ...row, rank: index + 1 }));
      const myRow = ranked.find((row) => row.studentId === String(student._id)) || null;

      return {
        top: ranked.slice(0, 10),
        myRank: myRow,
        totalParticipants: ranked.length
      };
    };

    const classLeaderboard = await buildLeaderboard({ schoolId: student.schoolId, standard: student.standard });
    const gradeLeaderboard = await buildLeaderboard({ standard: student.standard });

    res.json({
      classLeaderboard,
      gradeLeaderboard
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server

// ========== NEW ENDPOINTS FOR ENHANCED FEATURES ==========

// Track performance for adaptive difficulty
app.post('/api/track-performance', verifyToken, verifyStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { accuracy, difficulty, correctAnswers, totalAnswers, language, standard } = req.body;

    if (!accuracy || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create performance record
    const performanceRecord = {
      studentId,
      timestamp: Date.now(),
      accuracy,
      difficulty,
      correctAnswers,
      totalAnswers,
      language,
      standard
    };

    // Store in MongoDB (would create a Performance collection in production)
    console.log('Performance tracked:', performanceRecord);

    // Calculate suggested difficulty
    const threshold = { easy: 0.85, medium: 0.70, hard: 0.50 };
    let suggestedDifficulty = difficulty;

    if (accuracy >= threshold.easy && difficulty !== 'HARD') {
      suggestedDifficulty = difficulty === 'EASY' ? 'MEDIUM' : 'HARD';
    } else if (accuracy < threshold.hard && difficulty === 'HARD') {
      suggestedDifficulty = 'MEDIUM';
    } else if (accuracy < 0.3 && difficulty === 'MEDIUM') {
      suggestedDifficulty = 'EASY';
    }

    res.json({
      success: true,
      performance: performanceRecord,
      suggestedDifficulty,
      message: 'Performance recorded successfully'
    });
  } catch (error) {
    console.error('Performance tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get adaptive difficulty recommendation
app.get('/api/adaptive-difficulty/:studentId', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // In production, query actual performance history
    // For now, return based on standard
    const user = await Student.findById(studentId);
    if (!user) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Default difficulties for each standard
    const defaultDifficulty = {
      '1': 'EASY',
      '2': 'EASY',
      '3': 'MEDIUM',
      '4': 'MEDIUM',
      '5': 'MEDIUM',
      '6': 'HARD',
      '7': 'HARD'
    };

    res.json({
      studentId,
      recommendedDifficulty: defaultDifficulty[user.standard.toString()] || 'MEDIUM',
      availableDifficulties: ['EASY', 'MEDIUM', 'HARD'],
      message: 'Difficulty recommendation retrieved'
    });
  } catch (error) {
    console.error('Adaptive difficulty error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save assessment with extended metrics
app.post('/api/save-assessment-metrics', verifyToken, verifyStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { 
      language, 
      standard, 
      difficulty, 
      score, 
      timeSpent, 
      hintsUsed, 
      bookmarkedQuestions, 
      assessmentType 
    } = req.body;

    const sessionMetrics = {
      studentId,
      timestamp: Date.now(),
      language,
      standard,
      difficulty,
      score,
      timeSpent,
      hintsUsed: hintsUsed || 0,
      bookmarkedCount: bookmarkedQuestions?.length || 0,
      assessmentType,
      completionStatus: 'completed'
    };

    // In production, save to database
    console.log('Assessment metrics saved:', sessionMetrics);

    res.json({
      success: true,
      metrics: sessionMetrics,
      message: 'Assessment metrics saved successfully'
    });
  } catch (error) {
    console.error('Assessment metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save bookmarks
app.post('/api/save-bookmarks', verifyToken, verifyStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { bookmarkedQuestions, assessmentId, language, standard } = req.body;

    const bookmarkData = {
      studentId,
      timestamp: Date.now(),
      assessmentId,
      language,
      standard,
      bookmarkedQuestionIndices: bookmarkedQuestions || [],
      totalBookmarked: (bookmarkedQuestions || []).length
    };

    // In production, save to database
    console.log('Bookmarks saved:', bookmarkData);

    res.json({
      success: true,
      bookmarks: bookmarkData,
      message: 'Bookmarks saved successfully'
    });
  } catch (error) {
    console.error('Bookmarks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get timer settings by standard
app.get('/api/timer-settings/:standard', async (req, res) => {
  try {
    const { standard } = req.params;
    
    // Timer settings based on grade level
    const timerSettings = {
      '1': { timeLimit: 300, timerEnabled: false }, // 5 min, disabled for grade 1
      '2': { timeLimit: 300, timerEnabled: false }, // 5 min, disabled for grade 2
      '3': { timeLimit: 600, timerEnabled: false }, // 10 min, disabled for grade 3
      '4': { timeLimit: 600, timerEnabled: true },  // 10 min, enabled
      '5': { timeLimit: 600, timerEnabled: true },  // 10 min, enabled
      '6': { timeLimit: 900, timerEnabled: true },  // 15 min, enabled
      '7': { timeLimit: 900, timerEnabled: true }   // 15 min, enabled
    };

    const settings = timerSettings[standard] || { timeLimit: 600, timerEnabled: true };
    
    res.json({
      standard,
      ...settings,
      message: 'Timer settings retrieved'
    });
  } catch (error) {
    console.error('Timer settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== END NEW ENDPOINTS ==========

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
