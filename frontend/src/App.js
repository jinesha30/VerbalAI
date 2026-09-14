import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Registration from './components/Registration';
import Assessment from './components/Assessment';
import AdminDashboard from './components/AdminDashboard';
import StudentDashboard from './components/StudentDashboard';
import { initializeAxios } from './utils/axios';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext';
import { ToastProvider } from './components/Toast';
import './App.css';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button 
      className="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}

function AccessibilityControls() {
  const [isOpen, setIsOpen] = React.useState(false);
  const {
    settings,
    setHighContrast,
    setFontScale,
    setColorVisionMode,
    resetAccessibility
  } = useAccessibility();

  return (
    <div className="accessibility-tools">
      <button
        className="accessibility-toggle-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="accessibility-panel"
        aria-label="Open accessibility options"
        type="button"
      >
        A11y
      </button>

      {isOpen && (
        <section id="accessibility-panel" className="accessibility-panel" aria-label="Accessibility settings">
          <h3>Accessibility</h3>

          <label className="a11y-option">
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(event) => setHighContrast(event.target.checked)}
            />
            High contrast mode
          </label>

          <label className="a11y-option" htmlFor="font-scale-select">Font size</label>
          <select
            id="font-scale-select"
            value={settings.fontScale}
            onChange={(event) => setFontScale(event.target.value)}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="x-large">Extra large</option>
          </select>

          <label className="a11y-option" htmlFor="color-vision-select">Color-blind support</label>
          <select
            id="color-vision-select"
            value={settings.colorVisionMode}
            onChange={(event) => setColorVisionMode(event.target.value)}
          >
            <option value="off">Off</option>
            <option value="deuteranopia">Deuteranopia friendly</option>
            <option value="protanopia">Protanopia friendly</option>
            <option value="tritanopia">Tritanopia friendly</option>
          </select>

          <button type="button" className="a11y-reset-btn" onClick={resetAccessibility}>
            Reset
          </button>
        </section>
      )}
    </div>
  );
}

function AppContent() {
  useEffect(() => {
    // Initialize axios with JWT token on app load
    initializeAxios();
  }, []);

  return (
    <div className="App">
      <a className="skip-to-main" href="#main-content">Skip to main content</a>
      <ThemeToggle />
      <AccessibilityControls />
      <main id="main-content" tabIndex="-1" role="main">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AccessibilityProvider>
        <ToastProvider>
          <Router>
            <AppContent />
          </Router>
        </ToastProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}

export default App;
