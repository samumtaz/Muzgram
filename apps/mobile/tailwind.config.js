/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Muzgram design system — dark, warm
        background: {
          DEFAULT: '#0D0D0D',
          card: '#1A1A1A',
          elevated: '#242424',
        },
        surface: {
          DEFAULT: '#1A1A1A',
          border: '#2A2A2A',
        },
        brand: {
          // Warm gold accent
          gold: '#D4A853',
          'gold-dim': '#A07830',
          // Emerald for halal badge (quiet, non-preachy)
          emerald: '#2ECC71',
          'emerald-dim': '#1A7A43',
        },
        category: {
          eat: '#E07B39',        // Warm orange
          go_out: '#9B59B6',     // Deep purple
          connect: '#3498DB',    // Professional blue
        },
        text: {
          primary: '#F5F5F5',
          secondary: '#A0A0A0',
          muted: '#606060',
          inverse: '#0D0D0D',
        },
        status: {
          open: '#2ECC71',
          closed: '#E74C3C',
          featured: '#D4A853',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
        display: ['Inter-SemiBold', 'system-ui'],
        mono: ['JetBrainsMono', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        pill: '999px',
        badge: '6px',
      },
    },
  },
  plugins: [],
};
