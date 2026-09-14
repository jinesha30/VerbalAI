import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import './StudentDashboard.css';

const API_URL = 'http://localhost:5000/api';

const defaultAnalytics = {
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
};

const defaultGamification = {
  totalPoints: 0,
  currentStreak: 0,
  longestStreak: 0,
  badges: [],
  certificatesEarned: 0,
  totalAssessments: 0
};

const defaultLeaderboard = {
  classLeaderboard: { top: [], myRank: null, totalParticipants: 0 },
  gradeLeaderboard: { top: [], myRank: null, totalParticipants: 0 }
};

const defaultIntelligence = {
  adaptiveScheduler: {
    recommendedDifficulty: 'MEDIUM',
    focusAreas: [],
    weeklyPlan: [],
    nextReviewWindowDays: 1
  },
  learningCoach: {
    summary: 'Complete at least 3 assessments so a personalized coach can start guiding you.',
    nextActions: [],
    encouragement: 'Consistency will reveal your learning pattern.'
  },
  riskProfile: {
    score: 0,
    level: 'low',
    reasons: [],
    interventions: [],
    daysSinceLastAssessment: null,
    trend: 'stable'
  },
  insights: {
    totalAssessments: 0,
    strengths: [],
    weaknesses: [],
    averageScore: 0,
    averageAccuracy: 0,
    latestAssessmentAt: null
  }
};

const defaultMasteryMap = {
  summary: {
    totalSkills: 0,
    masteredSkills: 0,
    developingSkills: 0,
    supportSkills: 0,
    averageMastery: 0
  },
  weakestNode: null,
  strongestNode: null,
  nodes: [],
  edges: []
};

const defaultPracticeGenerator = {
  targetSkill: null,
  recommendedDifficulty: 'MEDIUM',
  rationale: 'Complete more assessments to unlock personalized practice generation.',
  nextSessionMinutes: 0,
  questionSet: [],
  completionSignal: 'Practice recommendations will appear after your next assessment.'
};

const defaultInterventionCopilot = {
  urgency: 'low',
  summary: 'No intervention required yet. Keep practicing regularly.',
  stakeholderMessage: '',
  triggers: [],
  actionPlan: [],
  expectedOutcome: 'Maintain current learning rhythm.'
};

function StudentDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [gamificationData, setGamificationData] = useState(defaultGamification);
  const [leaderboardData, setLeaderboardData] = useState(defaultLeaderboard);
  const [intelligenceData, setIntelligenceData] = useState(defaultIntelligence);
  const [masteryMapData, setMasteryMapData] = useState(defaultMasteryMap);
  const [practiceGeneratorData, setPracticeGeneratorData] = useState(defaultPracticeGenerator);
  const [interventionCopilotData, setInterventionCopilotData] = useState(defaultInterventionCopilot);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editReason, setEditReason] = useState('');
  const [pendingRequest, setPendingRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editableFields, setEditableFields] = useState({
    name: false,
    rollno: false,
    age: false,
    email: false,
    phone: false
  });

  useEffect(() => {
    // Check if user is logged in and is a student
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const userType = localStorage.getItem('userType');

    if (!user || userType !== 'student') {
      navigate('/login');
      return;
    }

    fetchDashboardData(user.id);
    checkPendingRequest(user.id);
  }, [navigate]);

  const checkPendingRequest = async (studentId) => {
    try {
      const response = await axios.get(`${API_URL}/edit-requests/student/${studentId}`);
      const pending = response.data.find(req => req.status === 'pending');
      setPendingRequest(pending);
    } catch (error) {
      console.error('Error checking pending requests:', error);
    }
  };

  const fetchDashboardData = async (studentId) => {
    setLoading(true);
    try {
      const dashboardResponse = await axios.get(`${API_URL}/student-dashboard/${studentId}`);
      setDashboardData(dashboardResponse.data);

      const [analyticsResult, gamificationResult, leaderboardResult, intelligenceResult, masteryResult, practiceResult, interventionResult] = await Promise.allSettled([
        axios.get(`${API_URL}/analytics/student/${studentId}`),
        axios.get(`${API_URL}/gamification/student/${studentId}`),
        axios.get(`${API_URL}/leaderboard/student/${studentId}`),
        axios.get(`${API_URL}/intelligence/student/${studentId}`),
        axios.get(`${API_URL}/mastery-map/student/${studentId}`),
        axios.get(`${API_URL}/practice-generator/student/${studentId}`),
        axios.get(`${API_URL}/intervention-copilot/student/${studentId}`)
      ]);

      if (analyticsResult.status === 'fulfilled') {
        setAnalyticsData(analyticsResult.value.data || defaultAnalytics);
      } else {
        console.error('Error fetching analytics, falling back to defaults:', analyticsResult.reason);
        setAnalyticsData(defaultAnalytics);
      }

      if (gamificationResult.status === 'fulfilled') {
        setGamificationData(gamificationResult.value.data || defaultGamification);
      } else {
        console.error('Error fetching gamification, falling back to defaults:', gamificationResult.reason);
        setGamificationData(defaultGamification);
      }

      if (leaderboardResult.status === 'fulfilled') {
        setLeaderboardData(leaderboardResult.value.data || defaultLeaderboard);
      } else {
        console.error('Error fetching leaderboard, falling back to defaults:', leaderboardResult.reason);
        setLeaderboardData(defaultLeaderboard);
      }

      if (intelligenceResult.status === 'fulfilled') {
        setIntelligenceData(intelligenceResult.value.data || defaultIntelligence);
      } else {
        console.error('Error fetching intelligence, falling back to defaults:', intelligenceResult.reason);
        setIntelligenceData(defaultIntelligence);
      }

      if (masteryResult.status === 'fulfilled') {
        setMasteryMapData(masteryResult.value.data || defaultMasteryMap);
      } else {
        console.error('Error fetching mastery map, falling back to defaults:', masteryResult.reason);
        setMasteryMapData(defaultMasteryMap);
      }

      if (practiceResult.status === 'fulfilled') {
        setPracticeGeneratorData(practiceResult.value.data || defaultPracticeGenerator);
      } else {
        console.error('Error fetching practice generator, falling back to defaults:', practiceResult.reason);
        setPracticeGeneratorData(defaultPracticeGenerator);
      }

      if (interventionResult.status === 'fulfilled') {
        setInterventionCopilotData(interventionResult.value.data || defaultInterventionCopilot);
      } else {
        console.error('Error fetching intervention copilot, falling back to defaults:', interventionResult.reason);
        setInterventionCopilotData(defaultInterventionCopilot);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(null);
      setAnalyticsData(defaultAnalytics);
      setGamificationData(defaultGamification);
      setLeaderboardData(defaultLeaderboard);
      setIntelligenceData(defaultIntelligence);
      setMasteryMapData(defaultMasteryMap);
      setPracticeGeneratorData(defaultPracticeGenerator);
      setInterventionCopilotData(defaultInterventionCopilot);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (key) => {
    const iconMap = {
      first_assessment: 'fas fa-seedling',
      consistent_5: 'fas fa-calendar-check',
      master_10: 'fas fa-brain',
      point_100: 'fas fa-coins',
      point_500: 'fas fa-gem',
      streak_3: 'fas fa-fire',
      streak_7: 'fas fa-bolt',
      high_score_90: 'fas fa-trophy'
    };
    return iconMap[key] || 'fas fa-award';
  };

  const handleDownloadCertificate = () => {
    if (!dashboardData?.student) return;

    const { student } = dashboardData;
    const doc = new jsPDF('landscape');

    doc.setDrawColor(60, 90, 170);
    doc.setLineWidth(3);
    doc.rect(10, 10, 277, 190);

    doc.setFontSize(28);
    doc.setTextColor(35, 58, 120);
    doc.text('Certificate of Achievement', 148.5, 42, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(55, 55, 55);
    doc.text('This certifies that', 148.5, 62, { align: 'center' });

    doc.setFontSize(30);
    doc.setTextColor(30, 30, 30);
    doc.text(student.name, 148.5, 82, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(55, 55, 55);
    doc.text('has demonstrated consistent learning progress', 148.5, 98, { align: 'center' });
    doc.text(`Total Points: ${gamificationData.totalPoints || 0}`, 148.5, 110, { align: 'center' });
    doc.text(`Current Streak: ${gamificationData.currentStreak || 0} day(s)`, 148.5, 120, { align: 'center' });
    doc.text(`Assessments Completed: ${gamificationData.totalAssessments || 0}`, 148.5, 130, { align: 'center' });

    doc.text(`Issued on ${new Date().toLocaleDateString()}`, 148.5, 152, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(105, 172, 192, 172);
    doc.setFontSize(11);
    doc.text('Learning Ability Assessment Platform', 148.5, 178, { align: 'center' });

    doc.save(`${student.name.replace(/\s+/g, '_')}_certificate.pdf`);
  };

  const formatDuration = (seconds) => {
    if (!seconds || Number.isNaN(seconds) || seconds <= 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const handleDownloadCsvReport = async () => {
    if (!dashboardData?.student?.id) return;
    try {
      const response = await axios.get(`${API_URL}/export/student/${dashboardData.student.id}/assessments`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dashboardData.student.name.replace(/\s+/g, '_')}_learning_report.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading CSV report:', error);
      alert('Could not download CSV report. Please try again.');
    }
  };

  const handleDownloadPdfReport = () => {
    if (!dashboardData?.student || !analyticsData) return;

    const { student, assessments } = dashboardData;
    const report = analyticsData;
    const doc = new jsPDF();
    let y = 15;

    doc.setFontSize(16);
    doc.text('Learning Performance Report', 14, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Student: ${student.name}`, 14, y); y += 6;
    doc.text(`Class: ${student.standard}`, 14, y); y += 6;
    doc.text(`School: ${student.school}`, 14, y); y += 6;
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y); y += 10;

    doc.setFontSize(13);
    doc.text('Performance Summary', 14, y); y += 8;
    doc.setFontSize(11);
    doc.text(`Total Assessments: ${report.totalAssessments || 0}`, 14, y); y += 6;
    doc.text(`Average Score: ${(report.averageScore || 0).toFixed(1)}%`, 14, y); y += 6;
    doc.text(`Average Accuracy: ${(report.averageAccuracy || 0).toFixed(1)}%`, 14, y); y += 6;
    doc.text(`Average Time Spent: ${formatDuration(report.averageTimeSpentSeconds || 0)}`, 14, y); y += 6;
    doc.text(`Best Score: ${(report.highestScore || 0).toFixed(1)}%`, 14, y); y += 10;

    doc.setFontSize(13);
    doc.text('Class Comparison', 14, y); y += 8;
    doc.setFontSize(11);
    doc.text(`Class Average Score: ${(report.classComparison?.classAverageScore || 0).toFixed(1)}%`, 14, y); y += 6;
    doc.text(`Class Average Accuracy: ${(report.classComparison?.classAverageAccuracy || 0).toFixed(1)}%`, 14, y); y += 6;
    doc.text(`Class Average Time: ${formatDuration(report.classComparison?.classAverageTimeSpentSeconds || 0)}`, 14, y); y += 6;
    doc.text(`Percentile Rank: ${report.classComparison?.studentPercentile || 0}th`, 14, y); y += 10;

    doc.setFontSize(13);
    doc.text('Strength Areas', 14, y); y += 8;
    doc.setFontSize(11);
    const strengths = report.strengths || [];
    if (strengths.length === 0) {
      doc.text('Not enough data yet.', 14, y);
      y += 6;
    } else {
      strengths.forEach((item) => {
        doc.text(`- ${item.subject}: ${item.avgScore.toFixed(1)}%`, 14, y);
        y += 6;
      });
    }

    y += 4;
    doc.setFontSize(13);
    doc.text('Improvement Areas', 14, y); y += 8;
    doc.setFontSize(11);
    const weaknesses = report.weaknesses || [];
    if (weaknesses.length === 0) {
      doc.text('Not enough data yet.', 14, y);
      y += 6;
    } else {
      weaknesses.forEach((item) => {
        doc.text(`- ${item.subject}: ${item.avgScore.toFixed(1)}%`, 14, y);
        y += 6;
      });
    }

    if (y > 220) {
      doc.addPage();
      y = 15;
    }

    y += 6;
    doc.setFontSize(13);
    doc.text('Recent Assessments', 14, y); y += 8;
    doc.setFontSize(10);
    assessments.slice(0, 10).forEach((assessment, index) => {
      const line = `${index + 1}. ${new Date(assessment.timestamp).toLocaleDateString()} | ${assessment.language || 'english'} | Score ${(assessment.score || 0).toFixed(1)}% | Accuracy ${((assessment.accuracy ?? ((assessment.totalCount ? (assessment.correctCount / assessment.totalCount) * 100 : 0))).toFixed(1))}% | Time ${formatDuration(assessment.durationSeconds || 0)}`;
      doc.text(line, 14, y);
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 15;
      }
    });

    doc.save(`${student.name.replace(/\s+/g, '_')}_learning_report.pdf`);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userType');
    navigate('/login');
  };

  const handleEditProfile = () => {
    if (pendingRequest) {
      alert('You already have a pending edit request. Please wait for admin approval.');
      return;
    }
    
    const { student } = dashboardData;
    setEditFormData({
      name: student.name,
      rollno: student.rollno,
      age: student.age,
      email: student.email || '',
      phone: student.phone || ''
    });
    setEditableFields({
      name: false,
      rollno: false,
      age: false,
      email: false,
      phone: false
    });
    setShowEditModal(true);
  };

  const toggleFieldEdit = (fieldName) => {
    setEditableFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Prepare only changed fields
      const { student } = dashboardData;
      const requestedChanges = {};
      
      if (editFormData.name !== student.name) requestedChanges.name = editFormData.name;
      if (editFormData.rollno !== student.rollno) requestedChanges.rollno = editFormData.rollno;
      if (editFormData.age !== student.age) requestedChanges.age = editFormData.age;
      if (editFormData.email !== (student.email || '')) requestedChanges.email = editFormData.email;
      if (editFormData.phone !== (student.phone || '')) requestedChanges.phone = editFormData.phone;

      if (Object.keys(requestedChanges).length === 0) {
        alert('No changes detected');
        setSubmitting(false);
        return;
      }

      await axios.post(`${API_URL}/edit-requests`, {
        studentId: student._id,
        studentName: student.name,
        schoolId: student.schoolId,
        schoolName: student.school,
        currentData: {
          name: student.name,
          rollno: student.rollno,
          age: student.age,
          email: student.email || '',
          phone: student.phone || ''
        },
        requestedChanges,
        reason: editReason
      });

      alert('Edit request submitted successfully! Waiting for admin approval.');
      setShowEditModal(false);
      setEditReason('');
      checkPendingRequest(student._id);
    } catch (error) {
      console.error('Error submitting edit request:', error);
      alert(error.response?.data?.error || 'Failed to submit edit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !dashboardData) {
    return (
      <div className="student-dashboard">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const { student, assessments } = dashboardData;
  const performanceAnalytics = analyticsData;
  const rewards = gamificationData || defaultGamification;
  const leaderboard = leaderboardData || defaultLeaderboard;
  const intelligence = intelligenceData || defaultIntelligence;
  const adaptiveScheduler = intelligence.adaptiveScheduler || defaultIntelligence.adaptiveScheduler;
  const learningCoach = intelligence.learningCoach || defaultIntelligence.learningCoach;
  const riskProfile = intelligence.riskProfile || defaultIntelligence.riskProfile;
  const masteryMap = masteryMapData || defaultMasteryMap;
  const practiceGenerator = practiceGeneratorData || defaultPracticeGenerator;
  const interventionCopilot = interventionCopilotData || defaultInterventionCopilot;
  
  // Calculate statistics from assessments
  const statistics = {
    totalAssessments: assessments.length,
    averageScore: performanceAnalytics.averageScore?.toFixed(1) || 0,
    averageAccuracy: performanceAnalytics.averageAccuracy?.toFixed(1) || 0,
    averageTimeSpentSeconds: performanceAnalytics.averageTimeSpentSeconds || 0,
    bestScore: assessments.length > 0 
      ? Math.max(...assessments.map(a => a.score))
      : 0,
    recentScore: assessments.length > 0 ? assessments[0].score : 0,
    trend: assessments.length >= 2 
      ? (assessments[0].score >= assessments[1].score ? 'improving' : 'declining')
      : 'stable'
  };

  const intelligenceAssessmentCount = intelligence.insights?.totalAssessments ?? statistics.totalAssessments;
  const schedulerUnlocked = intelligenceAssessmentCount >= 3;
  
  const recentAssessments = assessments.slice(0, 5);
  const progressSeries = (performanceAnalytics.progressData && performanceAnalytics.progressData.length > 0)
    ? performanceAnalytics.progressData
    : assessments.slice(0, 10).map((assessment) => ({
      date: new Date(assessment.timestamp).toLocaleDateString(),
      score: assessment.score || 0,
      accuracy: assessment.accuracy ?? (assessment.totalCount > 0 ? (assessment.correctCount / assessment.totalCount) * 100 : 0),
      timeSpentSeconds: assessment.durationSeconds || null
    }));
  
  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <i className="fas fa-arrow-trend-up"></i>;
    if (trend === 'declining') return <i className="fas fa-arrow-trend-down"></i>;
    return <i className="fas fa-arrow-right"></i>;
  };

  const getTrendColor = (trend) => {
    if (trend === 'improving') return '#28a745';
    if (trend === 'declining') return '#dc3545';
    return '#667eea';
  };

  const getAchievements = () => {
    const achievements = [];
    if (statistics.totalAssessments >= 10) achievements.push({ icon: 'fas fa-bullseye', title: 'Consistent Learner', desc: '10+ assessments completed' });
    if (statistics.bestScore >= 95) achievements.push({ icon: 'fas fa-trophy', title: 'Top Performer', desc: 'Scored 95% or higher' });
    if (statistics.averageScore >= 80) achievements.push({ icon: 'fas fa-star', title: 'Star Student', desc: 'Average score 80%+' });
    if (statistics.trend === 'improving') achievements.push({ icon: 'fas fa-chart-line', title: 'Rising Star', desc: 'Continuous improvement' });
    return achievements;
  };

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>My Dashboard</h1>
          <div className="user-info">
            <span className="welcome-text">Welcome, {student.name}!</span>
            <Link to="/assessment" className="assessment-link-btn">Take Assessment</Link>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <h2>{student.name}</h2>
              <p className="profile-detail">Roll No: {student.rollno}</p>
              <p className="profile-detail">{student.school}</p>
              <p className="profile-detail">Class {student.standard} | Age {student.age}</p>
            </div>
          </div>
          <div className="profile-actions">
            {pendingRequest ? (
              <div className="pending-request-banner">
                <span className="pending-icon">⏳</span>
                Edit request pending approval
              </div>
            ) : (
              <button onClick={handleEditProfile} className="edit-profile-btn">
                <i className="fas fa-edit"></i> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-chart-bar"></i></div>
            <div className="stat-content">
              <h3>Total Assessments</h3>
              <p className="stat-number">{statistics.totalAssessments}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-star"></i></div>
            <div className="stat-content">
              <h3>Average Score</h3>
              <p className="stat-number">{statistics.averageScore}%</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-bullseye"></i></div>
            <div className="stat-content">
              <h3>Average Accuracy</h3>
              <p className="stat-number">{statistics.averageAccuracy}%</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-stopwatch"></i></div>
            <div className="stat-content">
              <h3>Avg Time Per Test</h3>
              <p className="stat-number time-stat">{formatDuration(statistics.averageTimeSpentSeconds)}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon"><i className="fas fa-trophy"></i></div>
            <div className="stat-content">
              <h3>Best Score</h3>
              <p className="stat-number">{statistics.bestScore}%</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">{getTrendIcon(statistics.trend)}</div>
            <div className="stat-content">
              <h3>Progress Trend</h3>
              <p className="stat-number" style={{ color: getTrendColor(statistics.trend) }}>
                {statistics.trend.charAt(0).toUpperCase() + statistics.trend.slice(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Adaptive Learning Intelligence */}
        <div className="intelligence-section">
          <h2><i className="fas fa-brain"></i> Adaptive Learning Intelligence</h2>
          <div className="intelligence-grid">
            <div className="intelligence-card scheduler-card">
              <div className="intelligence-card-header">
                <h3>Adaptive Scheduler</h3>
                <span className={`difficulty-pill ${adaptiveScheduler.recommendedDifficulty.toLowerCase()}`}>
                  {adaptiveScheduler.recommendedDifficulty}
                </span>
              </div>
              <p className="intelligence-summary">
                Next review window: {adaptiveScheduler.nextReviewWindowDays || 1} day(s)
              </p>
              {(adaptiveScheduler.focusAreas || []).length > 0 ? (
                <div className="focus-tags">
                  {(adaptiveScheduler.focusAreas || []).map((area) => (
                    <span key={area.subject || area.label} className="focus-tag">
                      {area.label}
                    </span>
                  ))}
                </div>
                ) : schedulerUnlocked ? (
                  <p className="intelligence-muted">Your assessment history is enough to generate a general plan. More assessments will make topic targeting sharper.</p>
                ) : (
                  <p className="intelligence-muted">The scheduler unlocks after 3 assessments.</p>
              )}
              <div className="weekly-plan-list">
                {(adaptiveScheduler.weeklyPlan || []).slice(0, 5).map((item) => (
                  <div key={item.day} className="plan-item">
                    <div className="plan-meta">
                      <strong>{item.day}</strong>
                      <span>{item.durationMinutes} min</span>
                    </div>
                    <p>{item.title}</p>
                    <small>{item.action}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="intelligence-card coach-card">
              <div className="intelligence-card-header">
                <h3>AI Learning Coach</h3>
                <span className="coach-badge">Personalized</span>
              </div>
              <p className="intelligence-summary">{learningCoach.summary}</p>
              <p className="coach-encouragement">{learningCoach.encouragement}</p>
              <div className="coach-actions">
                <h4>Next actions</h4>
                <ol>
                  {(learningCoach.nextActions || []).map((action, index) => (
                    <li key={`${index}-${action}`}>{action}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="intelligence-card risk-card">
              <div className="intelligence-card-header">
                <h3>Risk Snapshot</h3>
                <span className={`risk-pill ${riskProfile.level}`}>{riskProfile.level}</span>
              </div>
              <div className="risk-meter">
                <div className="risk-meter-track">
                  <div className={`risk-meter-fill ${riskProfile.level}`} style={{ width: `${riskProfile.score || 0}%` }}></div>
                </div>
                <div className="risk-meter-value">{riskProfile.score || 0}/100</div>
              </div>
              <p className="intelligence-muted">
                Last activity: {riskProfile.daysSinceLastAssessment === null ? 'No assessments yet' : `${riskProfile.daysSinceLastAssessment} day(s) ago`}
              </p>
              <ul className="risk-list">
                {(riskProfile.reasons || []).slice(0, 4).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <div className="intervention-list">
                <h4>Recommended intervention</h4>
                <ul>
                  {(riskProfile.interventions || []).slice(0, 3).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="intelligence-section advanced-learning-section">
          <h2><i className="fas fa-sitemap"></i> Mastery Map & Guided Practice</h2>
          <div className="intelligence-grid advanced-learning-grid">
            <div className="intelligence-card">
              <div className="intelligence-card-header">
                <h3>Mastery Map</h3>
                <span className="coach-badge">{masteryMap.summary?.averageMastery || 0}%</span>
              </div>
              <p className="intelligence-summary">Average mastery across tracked skills</p>
              <div className="mastery-summary-grid">
                <div><strong>{masteryMap.summary?.masteredSkills || 0}</strong><span>Mastered</span></div>
                <div><strong>{masteryMap.summary?.developingSkills || 0}</strong><span>Developing</span></div>
                <div><strong>{masteryMap.summary?.supportSkills || 0}</strong><span>Need Support</span></div>
              </div>
              {(masteryMap.nodes || []).length === 0 ? (
                <p className="intelligence-muted">Skill graph appears after your first assessment history is built.</p>
              ) : (
                <div className="mastery-node-list">
                  {(masteryMap.nodes || []).slice(0, 4).map((node) => (
                    <div key={node.id} className="mastery-node-item">
                      <div>
                        <strong>{node.label}</strong>
                        <small>{node.attempts} attempt(s)</small>
                      </div>
                      <span>{node.mastery}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="intelligence-card">
              <div className="intelligence-card-header">
                <h3>Personalized Practice Generator</h3>
                <span className={`difficulty-pill ${(practiceGenerator.recommendedDifficulty || 'medium').toLowerCase()}`}>
                  {practiceGenerator.recommendedDifficulty || 'MEDIUM'}
                </span>
              </div>
              <p className="intelligence-summary">{practiceGenerator.rationale}</p>
              <p className="intelligence-muted">Estimated session time: {practiceGenerator.nextSessionMinutes || 0} min</p>
              {(practiceGenerator.questionSet || []).length === 0 ? (
                <p className="intelligence-muted">Your next practice set will appear here automatically.</p>
              ) : (
                <ul className="practice-list">
                  {(practiceGenerator.questionSet || []).slice(0, 4).map((item) => (
                    <li key={item.id}>
                      <strong>{item.prompt}</strong>
                      <small>{item.estimatedMinutes} min · {item.skillTag}</small>
                    </li>
                  ))}
                </ul>
              )}
              <p className="coach-encouragement">{practiceGenerator.completionSignal}</p>
            </div>

            <div className="intelligence-card">
              <div className="intelligence-card-header">
                <h3>Parent/Teacher Intervention Copilot</h3>
                <span className={`risk-pill ${interventionCopilot.urgency || 'low'}`}>{interventionCopilot.urgency || 'low'}</span>
              </div>
              <p className="intelligence-summary">{interventionCopilot.summary}</p>
              <p className="intelligence-muted">{interventionCopilot.stakeholderMessage}</p>
              {(interventionCopilot.actionPlan || []).length === 0 ? (
                <p className="intelligence-muted">No intervention plan needed right now.</p>
              ) : (
                <ul className="practice-list">
                  {(interventionCopilot.actionPlan || []).map((item) => (
                    <li key={item.id}>
                      <strong>{item.action}</strong>
                      <small>Owner: {item.owner} · Due in {item.dueInDays} day(s)</small>
                    </li>
                  ))}
                </ul>
              )}
              <p className="coach-encouragement">{interventionCopilot.expectedOutcome}</p>
            </div>
          </div>
        </div>

        {/* Gamification Hub */}
        <div className="gamification-section">
          <h2><i className="fas fa-gamepad"></i> Rewards & Progress</h2>
          <div className="gamification-grid">
            <div className="game-card">
              <div className="game-label">Total Points</div>
              <div className="game-value">{rewards.totalPoints || 0}</div>
            </div>
            <div className="game-card">
              <div className="game-label">Current Streak</div>
              <div className="game-value">{rewards.currentStreak || 0} day(s)</div>
            </div>
            <div className="game-card">
              <div className="game-label">Longest Streak</div>
              <div className="game-value">{rewards.longestStreak || 0} day(s)</div>
            </div>
            <div className="game-card">
              <div className="game-label">Certificates</div>
              <div className="game-value">{rewards.certificatesEarned || 0}</div>
            </div>
          </div>

          <div className="certificate-row">
            <button type="button" className="certificate-btn" onClick={handleDownloadCertificate}>
              <i className="fas fa-certificate"></i> Download Certificate
            </button>
          </div>

          <div className="badges-section">
            <h3><i className="fas fa-award"></i> Badges</h3>
            {(rewards.badges || []).length === 0 ? (
              <p className="badge-empty">Complete more assessments to unlock badges.</p>
            ) : (
              <div className="badges-grid">
                {(rewards.badges || []).map((badge) => (
                  <div key={badge.key} className="badge-card">
                    <div className="badge-icon"><i className={getBadgeIcon(badge.key)}></i></div>
                    <div className="badge-title">{badge.title}</div>
                    <div className="badge-description">{badge.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Achievements Section */}
        {getAchievements().length > 0 && (
          <div className="achievements-section">
            <h2><i className="fas fa-medal"></i> Your Achievements</h2>
            <div className="achievements-grid">
              {getAchievements().map((achievement, index) => (
                <div key={index} className="achievement-card">
                  <div className="achievement-icon"><i className={achievement.icon}></i></div>
                  <h3>{achievement.title}</h3>
                  <p>{achievement.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <h2><i className="fas fa-bolt"></i> Quick Actions</h2>
          <div className="quick-actions-grid">
            <Link to="/assessment" className="action-card">
              <div className="action-icon"><i className="fas fa-bullseye"></i></div>
              <h3>Take Assessment</h3>
              <p>Start a new learning assessment</p>
            </Link>
            <button type="button" className="action-card action-card-button" onClick={handleEditProfile}>
              <div className="action-icon"><i className="fas fa-edit"></i></div>
              <h3>Edit Profile</h3>
              <p>Update your information</p>
            </button>

            <button type="button" className="action-card action-card-button" onClick={handleDownloadCsvReport}>
              <div className="action-icon"><i className="fas fa-file-csv"></i></div>
              <h3>Download CSV</h3>
              <p>Export your detailed assessment report</p>
            </button>

            <button type="button" className="action-card action-card-button" onClick={handleDownloadPdfReport}>
              <div className="action-icon"><i className="fas fa-file-pdf"></i></div>
              <h3>Download PDF</h3>
              <p>Generate a printable performance report</p>
            </button>
          </div>
        </div>

        {/* Strength / Weakness */}
        <div className="insights-section">
          <div className="insight-card strengths">
            <h2><i className="fas fa-thumbs-up"></i> Strength Areas</h2>
            {(performanceAnalytics.strengths || []).length === 0 ? (
              <p>Not enough assessments yet.</p>
            ) : (
              (performanceAnalytics.strengths || []).map((item) => (
                <div key={`strength-${item.subject}`} className="insight-row">
                  <span className="insight-label">{item.subject}</span>
                  <span className="insight-value">{item.avgScore.toFixed(1)}%</span>
                </div>
              ))
            )}
          </div>

          <div className="insight-card weaknesses">
            <h2><i className="fas fa-screwdriver-wrench"></i> Improvement Areas</h2>
            {(performanceAnalytics.weaknesses || []).length === 0 ? (
              <p>Not enough assessments yet.</p>
            ) : (
              (performanceAnalytics.weaknesses || []).map((item) => (
                <div key={`weakness-${item.subject}`} className="insight-row">
                  <span className="insight-label">{item.subject}</span>
                  <span className="insight-value">{item.avgScore.toFixed(1)}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Class Comparison */}
        <div className="class-comparison-section">
          <h2><i className="fas fa-users"></i> Class Comparison</h2>
          <div className="class-metrics-grid">
            <div className="class-metric-card">
              <h4>Your Avg Score</h4>
              <p>{(performanceAnalytics.averageScore || 0).toFixed(1)}%</p>
            </div>
            <div className="class-metric-card">
              <h4>Class Avg Score</h4>
              <p>{(performanceAnalytics.classComparison?.classAverageScore || 0).toFixed(1)}%</p>
            </div>
            <div className="class-metric-card">
              <h4>Your Percentile</h4>
              <p>{performanceAnalytics.classComparison?.studentPercentile || 0}th</p>
            </div>
            <div className="class-metric-card">
              <h4>Class Size</h4>
              <p>{performanceAnalytics.classComparison?.classSize || 0}</p>
            </div>
          </div>
        </div>

        {/* Leaderboards */}
        <div className="leaderboard-section">
          <h2><i className="fas fa-ranking-star"></i> Leaderboards</h2>
          <div className="leaderboard-grid">
            <div className="leaderboard-card">
              <h3>Class Leaderboard</h3>
              {(leaderboard.classLeaderboard?.top || []).length === 0 ? (
                <p className="badge-empty">No class ranking data yet.</p>
              ) : (
                <ol>
                  {(leaderboard.classLeaderboard?.top || []).slice(0, 5).map((entry) => (
                    <li key={`class-${entry.studentId}`}>
                      <span>{entry.name}</span>
                      <strong>{entry.totalPoints} pts</strong>
                    </li>
                  ))}
                </ol>
              )}
              {leaderboard.classLeaderboard?.myRank && (
                <p className="my-rank">Your Class Rank: #{leaderboard.classLeaderboard.myRank.rank}</p>
              )}
            </div>

            <div className="leaderboard-card">
              <h3>Grade Leaderboard</h3>
              {(leaderboard.gradeLeaderboard?.top || []).length === 0 ? (
                <p className="badge-empty">No grade ranking data yet.</p>
              ) : (
                <ol>
                  {(leaderboard.gradeLeaderboard?.top || []).slice(0, 5).map((entry) => (
                    <li key={`grade-${entry.studentId}`}>
                      <span>{entry.name}</span>
                      <strong>{entry.totalPoints} pts</strong>
                    </li>
                  ))}
                </ol>
              )}
              {leaderboard.gradeLeaderboard?.myRank && (
                <p className="my-rank">Your Grade Rank: #{leaderboard.gradeLeaderboard.myRank.rank}</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Assessments */}
        {recentAssessments.length > 0 && (
          <div className="assessments-section">
            <div className="section-header-with-chart">
              <h2><i className="fas fa-chart-line"></i> Your Progress Journey</h2>
            </div>
            
            {/* Progress Chart */}
            <div className="progress-chart-container">
              <div className="progress-chart">
                {progressSeries.length > 0 ? progressSeries.slice().reverse().map((assessment, index) => (
                  <div key={index} className="chart-bar-wrapper">
                    <div 
                      className="chart-bar" 
                      style={{ 
                        height: `${Math.max(assessment.score, 5)}%`,
                        backgroundColor: 
                          assessment.score >= 90 ? '#28a745' : 
                          assessment.score >= 75 ? '#ffc107' : 
                          assessment.score >= 60 ? '#fd7e14' : '#dc3545'
                      }}
                    >
                      <span className="chart-value">{assessment.score.toFixed(0)}%</span>
                    </div>
                    <span className="chart-label">
                      {assessment.date}
                    </span>
                  </div>
                )) : <p className="progress-empty">No score trend data available yet.</p>}
              </div>
            </div>

            <div className="progress-chart-container">
              <h3>Accuracy Trend</h3>
              <div className="progress-chart accuracy-chart">
                {progressSeries.length > 0 ? progressSeries.slice().reverse().map((assessment, index) => (
                  <div key={`accuracy-${index}`} className="chart-bar-wrapper">
                    <div className="chart-bar accuracy" style={{ height: `${Math.max(assessment.accuracy || 0, 5)}%` }}>
                      <span className="chart-value">{(assessment.accuracy || 0).toFixed(0)}%</span>
                    </div>
                    <span className="chart-label">{assessment.date}</span>
                  </div>
                )) : <p className="progress-empty">No accuracy trend data available yet.</p>}
              </div>
            </div>

            <h2 style={{ marginTop: '2rem' }}>Recent Assessment History</h2>
            <div className="assessments-table-container">
              <table className="assessments-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Score</th>
                    <th>Accuracy</th>
                    <th>Time Spent</th>
                    <th>Correct Answers</th>
                    <th>Total Questions</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssessments.map((assessment, index) => (
                    <tr key={index}>
                      <td>{new Date(assessment.timestamp).toLocaleDateString()}</td>
                      <td>{assessment.language || 'english'}</td>
                      <td className="score-cell">
                        <span className={`score-badge ${
                          assessment.score >= 90 ? 'excellent' : 
                          assessment.score >= 75 ? 'good' : 
                          assessment.score >= 60 ? 'average' : 'needs-improvement'
                        }`}>
                          {assessment.score.toFixed(1)}%
                        </span>
                      </td>
                      <td>{((assessment.accuracy ?? (assessment.totalCount > 0 ? (assessment.correctCount / assessment.totalCount) * 100 : 0))).toFixed(1)}%</td>
                      <td>{formatDuration(assessment.durationSeconds || 0)}</td>
                      <td>{assessment.correctCount}</td>
                      <td>{assessment.totalCount}</td>
                      <td>
                        <div className="performance-bar">
                          <div 
                            className="performance-fill" 
                            style={{ 
                              width: `${assessment.score}%`,
                              backgroundColor: 
                                assessment.score >= 90 ? '#28a745' : 
                                assessment.score >= 75 ? '#ffc107' : 
                                assessment.score >= 60 ? '#fd7e14' : '#dc3545'
                            }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Assessments State */}
        {statistics.totalAssessments === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><i className="fas fa-clipboard"></i></div>
            <h2>No Assessments Yet</h2>
            <p>Start your learning journey by taking your first assessment!</p>
            <Link to="/assessment" className="start-assessment-btn">
              Take Your First Assessment
            </Link>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content edit-modal">
            <div className="modal-header">
              <h2>Request Profile Edit</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group field-with-edit">
                <label>Name</label>
                <div className="input-with-icon">
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    required
                    readOnly={!editableFields.name}
                    className={!editableFields.name ? 'readonly-field' : ''}
                  />
                  <button 
                    type="button" 
                    className={`edit-icon-btn ${editableFields.name ? 'active' : ''}`}
                    onClick={() => toggleFieldEdit('name')}
                    title={editableFields.name ? 'Lock field' : 'Edit field'}
                  >
                    <i className={editableFields.name ? 'fas fa-unlock' : 'fas fa-edit'}></i>
                  </button>
                </div>
              </div>

              <div className="form-group field-with-edit">
                <label>Roll Number</label>
                <div className="input-with-icon">
                  <input
                    type="text"
                    value={editFormData.rollno}
                    onChange={(e) => setEditFormData({...editFormData, rollno: e.target.value})}
                    required
                    readOnly={!editableFields.rollno}
                    className={!editableFields.rollno ? 'readonly-field' : ''}
                  />
                  <button 
                    type="button" 
                    className={`edit-icon-btn ${editableFields.rollno ? 'active' : ''}`}
                    onClick={() => toggleFieldEdit('rollno')}
                    title={editableFields.rollno ? 'Lock field' : 'Edit field'}
                  >
                    <i className={editableFields.rollno ? 'fas fa-unlock' : 'fas fa-edit'}></i>
                  </button>
                </div>
              </div>

              <div className="form-group field-with-edit">
                <label>Age</label>
                <div className="input-with-icon">
                  <input
                    type="number"
                    value={editFormData.age}
                    onChange={(e) => setEditFormData({...editFormData, age: e.target.value})}
                    required
                    min="5"
                    max="100"
                    readOnly={!editableFields.age}
                    className={!editableFields.age ? 'readonly-field' : ''}
                  />
                  <button 
                    type="button" 
                    className={`edit-icon-btn ${editableFields.age ? 'active' : ''}`}
                    onClick={() => toggleFieldEdit('age')}
                    title={editableFields.age ? 'Lock field' : 'Edit field'}
                  >
                    <i className={editableFields.age ? 'fas fa-unlock' : 'fas fa-edit'}></i>
                  </button>
                </div>
              </div>

              <div className="form-group field-with-edit">
                <label>Email</label>
                <div className="input-with-icon">
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    readOnly={!editableFields.email}
                    className={!editableFields.email ? 'readonly-field' : ''}
                  />
                  <button 
                    type="button" 
                    className={`edit-icon-btn ${editableFields.email ? 'active' : ''}`}
                    onClick={() => toggleFieldEdit('email')}
                    title={editableFields.email ? 'Lock field' : 'Edit field'}
                  >
                    <i className={editableFields.email ? 'fas fa-unlock' : 'fas fa-edit'}></i>
                  </button>
                </div>
              </div>

              <div className="form-group field-with-edit">
                <label>Phone</label>
                <div className="input-with-icon">
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    readOnly={!editableFields.phone}
                    className={!editableFields.phone ? 'readonly-field' : ''}
                  />
                  <button 
                    type="button" 
                    className={`edit-icon-btn ${editableFields.phone ? 'active' : ''}`}
                    onClick={() => toggleFieldEdit('phone')}
                    title={editableFields.phone ? 'Lock field' : 'Edit field'}
                  >
                    <i className={editableFields.phone ? 'fas fa-unlock' : 'fas fa-edit'}></i>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Reason for Edit Request</label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Please explain why you need to edit your information..."
                  required
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
