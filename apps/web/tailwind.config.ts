import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Muzgram design tokens — mirrors mobile NativeWind config
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
    },
  },
  plugins: [],
};

export default config;
