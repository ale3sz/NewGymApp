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
        gym: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          primary: '#38bdf8',
          accent: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
          muted: '#94a3b8'
        }
      }
    },
  },
  plugins: [],
}
