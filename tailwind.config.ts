import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        field: '#0f766e',
        pitch: '#facc15',
        ink: '#0f172a',
        'dark-bg': '#0f172a',
        'dark-card': '#1e293b',
        'dark-secondary': '#334155',
        'accent-teal': '#14b8a6',
        'success-green': '#22c55e',
        'warning-amber': '#f59e0b',
        'danger-red': '#ef4444'
      }
    }
  },
  plugins: []
} satisfies Config;
