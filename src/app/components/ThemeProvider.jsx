"use client";

import { useEffect } from 'react';

export default function ThemeProvider() {
  useEffect(() => {
    // This runs only on the client after hydration
    try {
      const savedTheme = localStorage.getItem('theme');
      
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // If no saved preference, check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // This component doesn't render anything
  return null;
}
