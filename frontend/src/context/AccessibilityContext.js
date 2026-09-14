import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AccessibilityContext = createContext();

const STORAGE_KEY = 'accessibility_settings';

const defaultSettings = {
  highContrast: false,
  fontScale: 'medium',
  colorVisionMode: 'off'
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      applySettings(defaultSettings);
      return;
    }

    try {
      const parsed = JSON.parse(rawValue);
      const merged = { ...defaultSettings, ...parsed };
      setSettings(merged);
      applySettings(merged);
    } catch (error) {
      setSettings(defaultSettings);
      applySettings(defaultSettings);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applySettings(settings);
  }, [settings]);

  const applySettings = (value) => {
    const root = document.documentElement;
    root.setAttribute('data-contrast', value.highContrast ? 'high' : 'normal');
    root.setAttribute('data-font-scale', value.fontScale);
    root.setAttribute('data-color-vision', value.colorVisionMode);
  };

  const value = useMemo(() => ({
    settings,
    setHighContrast: (highContrast) => {
      setSettings((prev) => ({ ...prev, highContrast }));
    },
    setFontScale: (fontScale) => {
      setSettings((prev) => ({ ...prev, fontScale }));
    },
    setColorVisionMode: (colorVisionMode) => {
      setSettings((prev) => ({ ...prev, colorVisionMode }));
    },
    resetAccessibility: () => {
      setSettings(defaultSettings);
    }
  }), [settings]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};
