/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vphs: {
          darkest: '#ffffff',
          dark: '#f8fafc',
          card: '#ffffff',
          cardLight: '#f8fafc',
          border: '#e2e8f0',
          gold: '#d97706',
          goldHover: '#b45309',
          goldLight: '#fef3c7',
          cyan: '#0284c7',
          textMuted: '#475569',
          textBright: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
