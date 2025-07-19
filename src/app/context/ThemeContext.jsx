"use client";

import { createContext, useContext, useEffect, useState } from 'react';

// Create the context
const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
});

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Provider component
export function ThemeContextProvider({ children }) {
  const [theme, setTheme] = useState('light'); // Default theme
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem('theme');
      
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Apply theme changes to document and localStorage
  useEffect(() => {
    if (!mounted) return;
    
    try {
      localStorage.setItem('theme', theme);
      
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error(e);
    }
  }, [theme, mounted]);

  // Value to be provided by the context
  const contextValue = {
    theme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
