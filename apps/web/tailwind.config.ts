import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0D0D0D',
          elevated: '#1A1A1A',
        },
        surface: {
          DEFAULT: '#1A1A1A',
          elevated: '#222222',
          border: '#2A2A2A',
        },
        brand: {
          gold: '#D4A853',
          'gold-light': '#E8C87E',
        },
        text: {
          primary: '#F5F5F5',
          secondary: '#A0A0A0',
          muted: '#606060',
          inverse: '#0D0D0D',
        },
        status: {
          open: '#4CAF50',
          closed: '#F44336',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        pill: '9999px',
        badge: '6px',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(-1deg)' },
          '50%': { transform: 'translateY(-16px) rotate(1deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.05)' },
        },
        'toast-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'toast-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        aurora: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '33%': { transform: 'translateY(-30px) scale(1.05)' },
          '66%': { transform: 'translateY(20px) scale(0.95)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 4s ease-in-out infinite',
        marquee: 'marquee 30s linear infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'toast-in-right': 'toast-in-right 0.6s ease forwards',
        'toast-in-left': 'toast-in-left 0.6s ease forwards',
        'spin-slow': 'spin-slow 12s linear infinite',
        shimmer: 'shimmer 3s linear infinite',
        'fade-up': 'fade-up 0.8s ease forwards',
        aurora: 'aurora 10s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
