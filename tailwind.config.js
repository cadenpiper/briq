/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'geist-sans': ['var(--font-geist-sans)'],
        'geist-mono': ['var(--font-geist-mono)'],
        'jetbrains-mono': ['var(--font-jetbrains-mono)'],
        'lato': ['var(--font-lato)'],
      },
      colors: {
        'cream': {
          50: '#E5D5B7',
          100: '#DBC9A6',
          200: '#D1BE95',
          300: '#C7B384',
          400: '#BDA873',
          500: '#B39D62',
          600: '#A99251',
        },
        'zen': {
          400: '#6B7280',
          500: '#4B5563',
          600: '#374151',
          700: '#2A2A2A',
          800: '#1F1F1F',
          900: '#171717',
          950: '#0F0F0F',
        },
      },
    },
  },
  plugins: [],
}
