import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        field: '#0f766e',
        pitch: '#facc15',
        ink: '#0f172a'
      }
    }
  },
  plugins: []
} satisfies Config;
