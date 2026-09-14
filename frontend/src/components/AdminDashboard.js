import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API_URL = 'http://localhost:5000/api';

const defaultAdminIntelligence = {
  scope: {
    type: 'school',
    schoolId: null,
    schoolName: 'School'
  },
  summary: {
    totalStudents: 0,
    averageRiskScore: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    totalAssessments: 0
  },
  riskBuckets: {
    low: 0,
    medium: 0,
    high: 0
  },
  interventionTargets: [],
  coachSignals: []
};

const defaultAdminInterventionCopilot = {
  totalStudents: 0,
  highUrgency: 0,
  mediumUrgency: 0,
  lowUrgency: 0,
  roster: []
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [editRequests, setEditRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [intelligenceData, setIntelligenceData] = useState(defaultAdminIntelligence);
  const [interventionCopilotData, setInterventionCopilotData] = useState(defaultAdminInterventionCopilot);
  const [newSchool, setNewSchool] = useState({
    name: '',
    address: '',
    city: '',
    state: ''
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check if user is logged in and is admin
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const userType = localStorage.getItem('userType');

    if (!user || userType !== 'admin') {
      navigate('/login');
      return;
    }

    setCurrentUser(user);
    setIsInitialized(true);
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser'));
      if (!user) {
        console.error('No user found in localStorage');
        navigate('/login');
        return;
      }
      
      const isSystemAdmin = user.role === 'system_admin';
      
      if (isSystemAdmin) {
        const [schoolsRes, statsRes, studentsRes, adminsRes, requestsRes, assessmentsRes, intelligenceRes, interventionRes] = await Promise.all([
          axios.get(`${API_URL}/schools`),
          axios.get(`${API_URL}/stats`),
          axios.get(`${API_URL}/students`),
          axios.get(`${API_URL}/admins`),
          axios.get(`${API_URL}/edit-requests`),
          axios.get(`${API_URL}/assessments`),
          axios.get(`${API_URL}/intelligence/admin`),
          axios.get(`${API_URL}/intervention-copilot/admin`)
        ]);
        setSchools(schoolsRes.data || []);
        setStats(statsRes.data || {});
        setStudents(studentsRes.data.students || []);
        setAdmins(adminsRes.data || []);
        setEditRequests(requestsRes.data || []);
        setAssessments(assessmentsRes.data || []);
        setIntelligenceData(intelligenceRes.data || defaultAdminIntelligence);
        setInterventionCopilotData(interventionRes.data || defaultAdminInterventionCopilot);
      } else {
        // School admin
        if (!user.schoolId) {
          console.error('School admin has no schoolId');
          alert('Error: Your account is not properly configured. Please contact system admin.');
          return;
        }
        
        const [schoolsRes, studentsRes, schoolStatsRes, requestsRes, assessmentsRes, intelligenceRes, interventionRes] = await Promise.all([
          axios.get(`${API_URL}/schools`),
          axios.get(`${API_URL}/students?schoolId=${user.schoolId}`),
          axios.get(`${API_URL}/school-stats/${user.schoolId}`),
          axios.get(`${API_URL}/edit-requests?schoolId=${user.schoolId}`),
          axios.get(`${API_URL}/assessments?schoolId=${user.schoolId}`),
          axios.get(`${API_URL}/intelligence/admin?schoolId=${user.schoolId}`),
          axios.get(`${API_URL}/intervention-copilot/admin?schoolId=${user.schoolId}`)
        ]);
        setSchools(schoolsRes.data || []);
        setStudents(studentsRes.data.students || []);
        setStats(schoolStatsRes.data || {});
        setEditRequests(requestsRes.data || []);
        setAssessments(assessmentsRes.data || []);
        setIntelligenceData(intelligenceRes.data || defaultAdminIntelligence);
        setInterventionCopilotData(interventionRes.data || defaultAdminInterventionCopilot);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load dashboard data. Please try refreshing the page.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userType');
    navigate('/login');
  };

  const handleAddSchool = async (e) => {
    e.preventDefault();
    
    if (!newSchool.name.trim()) {
      alert('School name is required');
      return;
    }

    try {
      await axios.post(`${API_URL}/schools`, newSchool);
      alert('School added successfully!');
      setNewSchool({ name: '', address: '', city: '', state: '' });
      setShowAddSchool(false);
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to add school';
      alert(errorMsg);
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete ${studentName}? This will also delete all their assessments.`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/students/${studentId}`);
      alert('Student deleted successfully!');
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to delete student';
      alert(errorMsg);
    }
  };

  const handleViewStudent = async (studentId) => {
    try {
      const response = await axios.get(`${API_URL}/students/${studentId}`);
      setSelectedStudent(response.data);
      setShowStudentDetails(true);
    } catch (error) {
      console.error('Error fetching student details:', error);
      alert('Failed to load student details');
    }
  };

  const handleDeleteAdmin = async (adminId, adminName) => {
    if (!window.confirm(`Are you sure you want to delete admin ${adminName}?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/admins/${adminId}`);
      alert('Admin deleted successfully!');
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to delete admin';
      alert(errorMsg);
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]).filter(key => key !== '_id' && key !== '__v' && key !== 'password');
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          let value = row[header];
          if (value === null || value === undefined) value = '';
          if (typeof value === 'string' && value.includes(',')) value = `"${value}"`;
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getPerformanceTrend = () => {
    if (!assessments || assessments.length < 2) return 'stable';
    const recent = assessments.slice(0, 5);
    const older = assessments.slice(5, 10);
    if (older.length === 0) return 'stable';
    const recentAvg = recent.reduce((sum, a) => sum + a.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, a) => sum + a.score, 0) / older.length;
    if (recentAvg > olderAvg + 5) return 'improving';
    if (recentAvg < olderAvg - 5) return 'declining';
    return 'stable';
  };

  const handleReviewRequest = async (requestId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this edit request?`)) {
      return;
    }

    try {
      await axios.patch(`${API_URL}/edit-requests/${requestId}`, {
        action,
        adminId: currentUser?._id || currentUser?.id,
        reviewNote: reviewNote || undefined
      });
      
      alert(`Request ${action}ed successfully!`);
      setSelectedRequest(null);
      setReviewNote('');
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.error || `Failed to ${action} request`;
      alert(errorMsg);
    }
  };

  const pendingRequestsCount = editRequests.filter(req => req.status === 'pending').length;
  const adminIntelligence = intelligenceData || defaultAdminIntelligence;
  const interventionCopilot = interventionCopilotData || defaultAdminInterventionCopilot;

  if (!currentUser || !isInitialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  const isSystemAdmin = currentUser?.role === 'system_admin';
  const roleClass = isSystemAdmin ? 'system-admin' : 'school-admin';

  return (
    <div className={`admin-dashboard ${roleClass}`}>
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <div className="user-info">
            <span className="user-name">{currentUser?.name || 'Admin'}</span>
            <span className={`user-role ${roleClass}`}>
              {currentUser?.role === 'system_admin' ? 'System Admin' : `${currentUser?.schoolName || 'School'} Admin`}
            </span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <nav className="dashboard-nav">
          <button 
            className={activeTab === 'overview' ? 'active' : ''} 
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          {isSystemAdmin && (
            <>
              <button 
                className={activeTab === 'schools' ? 'active' : ''} 
                onClick={() => setActiveTab('schools')}
              >
                Schools
              </button>
              <button 
                className={activeTab === 'admins' ? 'active' : ''} 
                onClick={() => setActiveTab('admins')}
              >
                School Admins
              </button>
            </>
          )}
          <button 
            className={activeTab === 'students' ? 'active' : ''} 
            onClick={() => setActiveTab('students')}
          >
            Students
          </button>
          <button 
            className={activeTab === 'edit-requests' ? 'active' : ''} 
            onClick={() => setActiveTab('edit-requests')}
          >
            Edit Requests {pendingRequestsCount > 0 && <span className="badge">{pendingRequestsCount}</span>}
          </button>
          <button 
            className={activeTab === 'assessments' ? 'active' : ''} 
            onClick={() => setActiveTab('assessments')}
          >
            Assessments
          </button>
        </nav>

        <div className="dashboard-main">
          {activeTab === 'overview' && (
            <div className="overview-section">
              <div className="overview-header">
                <h2>{isSystemAdmin ? 'System Overview' : 'School Overview'}</h2>
                <div className="overview-actions">
                  <button className="export-btn" onClick={() => exportToCSV(students, 'students')}>
                    <i className="fas fa-file-csv"></i> Export Students
                  </button>
                  {assessments.length > 0 && (
                    <button className="export-btn" onClick={() => exportToCSV(assessments, 'assessments')}>
                      <i className="fas fa-file-export"></i> Export Assessments
                    </button>
                  )}
                </div>
              </div>
              <div className="stats-grid">
                {isSystemAdmin && (
                  <div className="stat-card">
                    <h3>Total Schools</h3>
                    <p className="stat-number">{schools.length}</p>
                  </div>
                )}
                <div className="stat-card">
                  <h3>Total Students</h3>
                  <p className="stat-number">{stats.totalStudents || 0}</p>
                </div>
                <div className="stat-card">
                  <h3>Total Assessments</h3>
                  <p className="stat-number">{stats.totalAssessments || 0}</p>
                </div>
                <div className="stat-card">
                  <h3>Average Score</h3>
                  <p className="stat-number">{stats.averageScore || 0}%</p>
                </div>
                {assessments.length >= 2 && (
                  <div className="stat-card trend-card">
                    <h3>Performance Trend</h3>
                    <p className="trend-indicator">
                      {getPerformanceTrend() === 'improving' && <><i className="fas fa-arrow-trend-up"></i> Improving</>}
                      {getPerformanceTrend() === 'declining' && <><i className="fas fa-arrow-trend-down"></i> Declining</>}
                      {getPerformanceTrend() === 'stable' && <><i className="fas fa-arrows-left-right"></i> Stable</>}
                    </p>
                  </div>
                )}
              </div>

              {!isSystemAdmin && (
                <div className="school-info">
                  <h3>Your School</h3>
                  <p><strong>{currentUser?.schoolName || 'N/A'}</strong></p>
                </div>
              )}

              <div className="intelligence-section admin-intelligence-section">
                <div className="section-header">
                  <h2>Risk & Intervention Intelligence</h2>
                  <p className="student-count">{adminIntelligence.scope?.schoolName || 'School'} scope</p>
                </div>

                <div className="intelligence-grid admin-intelligence-grid">
                  <div className="intelligence-card summary-card">
                    <h3>Overview</h3>
                    <div className="summary-metrics">
                      <div><strong>{adminIntelligence.summary?.totalStudents || 0}</strong><span>Students</span></div>
                      <div><strong>{adminIntelligence.summary?.totalAssessments || 0}</strong><span>Assessments</span></div>
                      <div><strong>{adminIntelligence.summary?.averageRiskScore || 0}</strong><span>Avg Risk</span></div>
                    </div>
                  </div>

                  <div className="intelligence-card summary-card risk-buckets-card">
                    <h3>Risk Buckets</h3>
                    <div className="bucket-list">
                      <div><span className="bucket-label high">High</span><strong>{adminIntelligence.riskBuckets?.high || 0}</strong></div>
                      <div><span className="bucket-label medium">Medium</span><strong>{adminIntelligence.riskBuckets?.medium || 0}</strong></div>
                      <div><span className="bucket-label low">Low</span><strong>{adminIntelligence.riskBuckets?.low || 0}</strong></div>
                    </div>
                  </div>

                  <div className="intelligence-card summary-card">
                    <h3>Priority Students</h3>
                    {(adminIntelligence.interventionTargets || []).length === 0 ? (
                      <p className="intelligence-muted">No students need intervention yet.</p>
                    ) : (
                      <div className="priority-list">
                        {(adminIntelligence.interventionTargets || []).slice(0, 4).map((student) => (
                          <div key={student.studentId} className="priority-item">
                            <div>
                              <strong>{student.name}</strong>
                              <p>{student.standard} | {student.riskLevel}</p>
                            </div>
                            <span>{student.riskScore}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="intelligence-card summary-card coach-card">
                    <h3>Coach Signals</h3>
                    {(adminIntelligence.coachSignals || []).length === 0 ? (
                      <p className="intelligence-muted">Signals will appear after assessments are recorded.</p>
                    ) : (
                      <ul className="coach-signal-list">
                        {(adminIntelligence.coachSignals || []).map((signal) => (
                          <li key={signal.studentId}>
                            <strong>{signal.name}</strong>
                            <span>{signal.signal}</span>
                            <small>{signal.nextStep}</small>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="admin-copilot-panel">
                  <h3>Parent/Teacher Intervention Copilot</h3>
                  <div className="summary-metrics">
                    <div><strong>{interventionCopilot.totalStudents || 0}</strong><span>Students Reviewed</span></div>
                    <div><strong>{interventionCopilot.highUrgency || 0}</strong><span>High Urgency</span></div>
                    <div><strong>{interventionCopilot.mediumUrgency || 0}</strong><span>Medium Urgency</span></div>
                  </div>
                  {(interventionCopilot.roster || []).length === 0 ? (
                    <p className="intelligence-muted">No intervention roster generated yet.</p>
                  ) : (
                    <ul className="coach-signal-list" style={{ marginTop: '0.8rem' }}>
                      {(interventionCopilot.roster || []).slice(0, 5).map((item) => (
                        <li key={item.studentId}>
                          <strong>{item.name} (Std {item.standard})</strong>
                          <span>{item.summary}</span>
                          <small>{item.topAction?.action || 'Monitor weekly progress.'}</small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schools' && isSystemAdmin && (
            <div className="schools-section">
              <div className="section-header">
                <h2>Schools Management</h2>
                <button 
                  className="add-btn" 
                  onClick={() => setShowAddSchool(!showAddSchool)}
                >
                  {showAddSchool ? 'Cancel' : 'Add School'}
                </button>
              </div>

              {showAddSchool && (
                <form className="add-school-form" onSubmit={handleAddSchool}>
                  <h3>Add New School</h3>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="School Name *"
                      value={newSchool.name}
                      onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Address"
                      value={newSchool.address}
                      onChange={(e) => setNewSchool({...newSchool, address: e.target.value})}
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="City"
                      value={newSchool.city}
                      onChange={(e) => setNewSchool({...newSchool, city: e.target.value})}
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={newSchool.state}
                      onChange={(e) => setNewSchool({...newSchool, state: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="submit-btn">Add School</button>
                </form>
              )}

              <div className="schools-list">
                <table>
                  <thead>
                    <tr>
                      <th>School Name</th>
                      <th>City</th>
                      <th>State</th>
                      <th>Admin Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools.map(school => (
                      <tr key={school._id}>
                        <td>{school.name}</td>
                        <td>{school.city || 'N/A'}</td>
                        <td>{school.state || 'N/A'}</td>
                        <td>
                          <span className={`status ${school.hasAdmin ? 'has-admin' : 'no-admin'}`}>
                            {school.hasAdmin ? 'Has Admin' : 'No Admin'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="students-section">
              <div className="section-header">
                <h2>{isSystemAdmin ? 'All Students' : 'My School Students'}</h2>
                <p className="student-count">Total: {students.length}</p>
              </div>

              {students.length === 0 ? (
                <div className="empty-state">
                  <p>No students registered yet.</p>
                </div>
              ) : (
                <div className="students-list">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Roll No</th>
                        <th>School</th>
                        <th>Standard</th>
                        <th>Age</th>
                        <th>Username</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student._id}>
                          <td>{student.name}</td>
                          <td>{student.rollno}</td>
                          <td>{student.school}</td>
                          <td>{student.standard}</td>
                          <td>{student.age}</td>
                          <td>{student.username}</td>
                          <td>
                            <button 
                              className="action-btn view-btn"
                              onClick={() => handleViewStudent(student._id)}
                            >
                              View
                            </button>
                            <button 
                              className="action-btn delete-btn"
                              onClick={() => handleDeleteStudent(student._id, student.name)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'admins' && isSystemAdmin && (
            <div className="admins-section">
              <div className="section-header">
                <h2>School Admins Management</h2>
                <p className="admin-count">Total: {admins.filter(a => a.role === 'school_admin').length}</p>
              </div>

              <div className="admins-list">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Username</th>
                      <th>School</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map(admin => (
                      <tr key={admin._id}>
                        <td>{admin.name}</td>
                        <td>{admin.email}</td>
                        <td>{admin.username}</td>
                        <td>{admin.schoolName || 'N/A'}</td>
                        <td>
                          <span className={`role-badge ${admin.role}`}>
                            {admin.role === 'system_admin' ? 'System Admin' : 'School Admin'}
                          </span>
                        </td>
                        <td>
                          {admin.role !== 'system_admin' && (
                            <button 
                              className="action-btn delete-btn"
                              onClick={() => handleDeleteAdmin(admin._id, admin.name)}
                            >
                              Delete
                            </button>
                          )}
                          {admin.role === 'system_admin' && (
                            <span className="protected-label">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="admin-note">
                <p><strong>Note:</strong> Deleting a school admin will allow a new admin to be assigned to that school.</p>
              </div>
            </div>
          )}

          {activeTab === 'assessments' && (
            <div className="assessments-section">
              <h2>Assessment Analytics</h2>
              
              {assessments.length === 0 ? (
                <div className="no-data">
                  <p>No assessments found.</p>
                </div>
              ) : (
                <>
                  {/* School-Level Statistics */}
                  <div className="analytics-section">
                    <h3>School Performance Overview</h3>
                    <div className="assessments-summary">
                      <div className="summary-card">
                        <h3>Total Schools</h3>
                        <p className="summary-number">{schools.length}</p>
                      </div>
                      <div className="summary-card">
                        <h3>Total Students</h3>
                        <p className="summary-number">{students.length}</p>
                      </div>
                      <div className="summary-card">
                        <h3>Total Assessments</h3>
                        <p className="summary-number">{assessments.length}</p>
                      </div>
                      <div className="summary-card">
                        <h3>Overall Average</h3>
                        <p className="summary-number">
                          {(assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Student Performance Summary */}
                  <div className="analytics-section">
                    <h3>Student Performance Summary</h3>
                    <div className="student-performance-grid">
                      {(() => {
                        // Group assessments by student
                        const studentStats = {};
                        assessments.forEach(assessment => {
                          if (!studentStats[assessment.studentId]) {
                            studentStats[assessment.studentId] = {
                              name: assessment.studentName,
                              standard: assessment.standard,
                              assessments: [],
                              totalScore: 0,
                              count: 0
                            };
                          }
                          studentStats[assessment.studentId].assessments.push(assessment);
                          studentStats[assessment.studentId].totalScore += assessment.score;
                          studentStats[assessment.studentId].count++;
                        });

                        // Convert to array and calculate averages
                        const studentArray = Object.values(studentStats).map(student => ({
                          ...student,
                          avgScore: student.totalScore / student.count,
                          lastAssessment: student.assessments[0].timestamp
                        })).sort((a, b) => b.avgScore - a.avgScore);

                        return (
                          <table className="student-summary-table">
                            <thead>
                              <tr>
                                <th>Student Name</th>
                                <th>Standard</th>
                                <th>Total Assessments</th>
                                <th>Average Score</th>
                                <th>Last Assessment</th>
                                <th>Performance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentArray.map((student, idx) => (
                                <tr key={idx}>
                                  <td><strong>{student.name}</strong></td>
                                  <td>{student.standard}</td>
                                  <td>{student.count}</td>
                                  <td className={`score ${student.avgScore >= 70 ? 'good' : student.avgScore >= 50 ? 'average' : 'low'}`}>
                                    {student.avgScore.toFixed(1)}%
                                  </td>
                                  <td>{new Date(student.lastAssessment).toLocaleDateString()}</td>
                                  <td>
                                    <span className={`performance-badge ${student.avgScore >= 70 ? 'excellent' : student.avgScore >= 50 ? 'good' : 'needs-improvement'}`}>
                                      {student.avgScore >= 70 ? 'Excellent' : student.avgScore >= 50 ? 'Good' : 'Needs Improvement'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Top & Bottom Performers */}
                  <div className="analytics-section">
                    <div className="performers-grid">
                      <div className="performers-card">
                        <h3><i className="fas fa-trophy"></i> Top Performers</h3>
                        <div className="performers-list">
                          {(() => {
                            const studentAvgs = {};
                            assessments.forEach(a => {
                              if (!studentAvgs[a.studentId]) {
                                studentAvgs[a.studentId] = { name: a.studentName, scores: [] };
                              }
                              studentAvgs[a.studentId].scores.push(a.score);
                            });
                            return Object.values(studentAvgs)
                              .map(s => ({ name: s.name, avg: s.scores.reduce((a, b) => a + b, 0) / s.scores.length }))
                              .sort((a, b) => b.avg - a.avg)
                              .slice(0, 5)
                              .map((student, idx) => (
                                <div key={idx} className="performer-item">
                                  <span className="rank">{idx + 1}</span>
                                  <span className="name">{student.name}</span>
                                  <span className="score-badge good">{student.avg.toFixed(1)}%</span>
                                </div>
                              ));
                          })()}
                        </div>
                      </div>
                      
                      <div className="performers-card">
                        <h3><i className="fas fa-hand-holding-heart"></i> Needs Support</h3>
                        <div className="performers-list">
                          {(() => {
                            const studentAvgs = {};
                            assessments.forEach(a => {
                              if (!studentAvgs[a.studentId]) {
                                studentAvgs[a.studentId] = { name: a.studentName, scores: [] };
                              }
                              studentAvgs[a.studentId].scores.push(a.score);
                            });
                            return Object.values(studentAvgs)
                              .map(s => ({ name: s.name, avg: s.scores.reduce((a, b) => a + b, 0) / s.scores.length }))
                              .sort((a, b) => a.avg - b.avg)
                              .slice(0, 5)
                              .map((student, idx) => (
                                <div key={idx} className="performer-item">
                                  <span className="rank">{idx + 1}</span>
                                  <span className="name">{student.name}</span>
                                  <span className="score-badge low">{student.avg.toFixed(1)}%</span>
                                </div>
                              ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'edit-requests' && (
            <div className="edit-requests-section">
              <h2>Profile Edit Requests</h2>
              
              {/* Pending Requests */}
              {editRequests.filter(req => req.status === 'pending').length > 0 && (
                <>
                  <h3>Pending Requests</h3>
                  <div className="requests-table-container">
                    <table className="requests-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Student</th>
                          <th>School</th>
                          <th>Changes Requested</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editRequests
                          .filter(req => req.status === 'pending')
                          .map(request => (
                            <tr key={request._id}>
                              <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                              <td>{request.studentName}</td>
                              <td>{request.schoolName}</td>
                              <td>
                                {Object.keys(request.requestedChanges).length} field(s)
                              </td>
                              <td>
                                <button 
                                  onClick={() => setSelectedRequest(request)}
                                  className="view-btn"
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Reviewed Requests */}
              {editRequests.filter(req => req.status !== 'pending').length > 0 && (
                <>
                  <h3 style={{ marginTop: '2rem' }}>Review History</h3>
                  <div className="requests-table-container">
                    <table className="requests-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Student</th>
                          <th>Status</th>
                          <th>Reviewed Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editRequests
                          .filter(req => req.status !== 'pending')
                          .map(request => (
                            <tr key={request._id}>
                              <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                              <td>{request.studentName}</td>
                              <td>
                                <span className={`status-badge status-${request.status}`}>
                                  {request.status.toUpperCase()}
                                </span>
                              </td>
                              <td>{new Date(request.reviewedAt).toLocaleDateString()}</td>
                              <td>
                                <button 
                                  onClick={() => setSelectedRequest(request)}
                                  className="view-btn"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {editRequests.length === 0 && (
                <p className="no-data">No edit requests found.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Student Details Modal */}
      {showStudentDetails && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowStudentDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Student Details</h2>
              <button className="close-btn" onClick={() => setShowStudentDetails(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="student-info">
                <h3>Personal Information</h3>
                <div className="info-grid">
                  <div><strong>Name:</strong> {selectedStudent?.name || 'N/A'}</div>
                  <div><strong>Roll No:</strong> {selectedStudent?.rollno || 'N/A'}</div>
                  <div><strong>School:</strong> {selectedStudent?.school || 'N/A'}</div>
                  <div><strong>Standard:</strong> {selectedStudent?.standard || 'N/A'}</div>
                  <div><strong>Age:</strong> {selectedStudent?.age || 'N/A'}</div>
                  <div><strong>Username:</strong> {selectedStudent?.username || 'N/A'}</div>
                  {selectedStudent?.email && (
                    <div><strong>Email:</strong> {selectedStudent.email}</div>
                  )}
                  {selectedStudent?.phone && (
                    <div><strong>Phone:</strong> {selectedStudent.phone}</div>
                  )}
                </div>
              </div>

              <div className="student-stats">
                <h3>Performance Statistics</h3>
                <div className="stats-grid-small">
                  <div className="stat-box">
                    <div className="stat-label">Total Assessments</div>
                    <div className="stat-value">{selectedStudent?.assessments?.length || 0}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Average Score</div>
                    <div className="stat-value">
                      {selectedStudent?.assessments?.length > 0 
                        ? (selectedStudent.assessments.reduce((sum, a) => sum + a.score, 0) / selectedStudent.assessments.length).toFixed(2)
                        : 0}%
                    </div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Last Assessment</div>
                    <div className="stat-value-small">
                      {selectedStudent?.assessments?.[0]?.timestamp
                        ? new Date(selectedStudent.assessments[0].timestamp).toLocaleDateString()
                        : 'N/A'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {selectedStudent?.assessments && selectedStudent.assessments.length > 0 && (
                <div className="recent-assessments">
                  <h3>Recent Assessments</h3>
                  <table className="modal-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Score</th>
                        <th>Correct</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudent.assessments.map((assessment, idx) => (
                        <tr key={idx}>
                          <td>{new Date(assessment.timestamp).toLocaleDateString()}</td>
                          <td className="score-cell">{assessment.score.toFixed(2)}%</td>
                          <td>{assessment.correctCount}</td>
                          <td>{assessment.totalCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Review Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => { setSelectedRequest(null); setReviewNote(''); }}>
          <div className="modal-content review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Review Edit Request</h2>
              <button className="close-btn" onClick={() => { setSelectedRequest(null); setReviewNote(''); }}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="request-info">
                <p><strong>Student:</strong> {selectedRequest.studentName}</p>
                <p><strong>School:</strong> {selectedRequest.schoolName}</p>
                <p><strong>Submitted:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}</p>
                <p><strong>Status:</strong> <span className={`status-badge status-${selectedRequest.status}`}>{selectedRequest.status.toUpperCase()}</span></p>
                {selectedRequest.reason && (
                  <p><strong>Reason:</strong> {selectedRequest.reason}</p>
                )}
              </div>

              <div className="changes-comparison">
                <h3>Requested Changes</h3>
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Current Value</th>
                      <th>Requested Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(selectedRequest.requestedChanges).map(field => (
                      <tr key={field}>
                        <td className="field-name">{field.charAt(0).toUpperCase() + field.slice(1)}</td>
                        <td className="old-value">{selectedRequest.currentData[field] || '-'}</td>
                        <td className="new-value">{selectedRequest.requestedChanges[field] || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="review-actions">
                  <div className="form-group">
                    <label>Review Note (Optional)</label>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Add a note about your decision..."
                      rows="3"
                    />
                  </div>

                  <div className="action-buttons">
                    <button 
                      onClick={() => handleReviewRequest(selectedRequest._id, 'reject')}
                      className="reject-btn"
                    >
                      ❌ Reject
                    </button>
                    <button 
                      onClick={() => handleReviewRequest(selectedRequest._id, 'approve')}
                      className="approve-btn"
                    >
                      ✅ Approve
                    </button>
                  </div>
                </div>
              )}

              {selectedRequest.status !== 'pending' && (
                <div className="review-result">
                  <h3>Review Details</h3>
                  <p><strong>Reviewed:</strong> {new Date(selectedRequest.reviewedAt).toLocaleString()}</p>
                  {selectedRequest.reviewNote && (
                    <p><strong>Note:</strong> {selectedRequest.reviewNote}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
