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
          dark: '#09090b',
          card: '#121215',
          border: '#27272a',
          primary: '#ef4444',
          accent: '#dc2626',
          warning: '#f59e0b',
          danger: '#b91c1c',
          muted: '#a1a1aa'
        }
      }
    },
  },
  plugins: [],
}
