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
        'danger-red': '#ef4444',
        'team-a': '#0d9488',
        'team-b': '#ea580c'
      },
      animation: {
        'score-pop': 'scorePop 0.8s ease-out forwards',
        'wicket-impact': 'wicketImpact 1s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-in-right': 'slideInRight 0.4s ease-out forwards',
        'stagger-1': 'fadeInUp 0.5s ease-out 0.1s forwards',
        'stagger-2': 'fadeInUp 0.5s ease-out 0.2s forwards',
        'stagger-3': 'fadeInUp 0.5s ease-out 0.3s forwards',
        'stagger-4': 'fadeInUp 0.5s ease-out 0.4s forwards',
        'stagger-5': 'fadeInUp 0.5s ease-out 0.5s forwards',
        'stagger-6': 'fadeInUp 0.5s ease-out 0.6s forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'live-pulse': 'livePulse 1.5s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards'
      },
      keyframes: {
        scorePop: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-60px) scale(1.3)' }
        },
        wicketImpact: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)', color: '#ef4444' },
          '50%': { opacity: '1', transform: 'translateY(-30px) scale(1.5)', color: '#dc2626' },
          '100%': { opacity: '0', transform: 'translateY(-80px) scale(1.2)', color: '#991b1b' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(20, 184, 166, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(20, 184, 166, 0.6)' }
        },
        livePulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
} satisfies Config;
