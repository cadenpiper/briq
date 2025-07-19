// This script runs before the page renders to set the theme
// and prevent flash of incorrect theme
export function themeScript() {
  return `
    (function() {
      try {
        // Check if user has a saved preference
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
        // If localStorage is not available or any other error occurs
        console.error(e);
      }
    })();
  `;
}
