/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Direction A — warm & community palette. Mirrors design/direction-a.html.
        cream:  { 50: '#fdfbf6', 100: '#faf7f2', 200: '#f2ece0' },
        sage:   { 50: '#eef7f5', 100: '#d6ece5', 400: '#5ab6a8', 500: '#2f9c8e', 600: '#218276', 700: '#1a685e', 900: '#0f3c36' },
        clay:   { 300: '#e8a275', 500: '#c75d3e', 600: '#a84a2f' },
        blush:  { 50: '#fdf3ea', 100: '#fbe7d4', 200: '#f6cda7', 300: '#ecb184' },
        butter: { 100: '#fcf4dc', 200: '#f5e5b5' },
        ink:    { 900: '#1c2927', 700: '#3a4744', 500: '#6b7570' },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        hand:  ['Caveat', 'Fraunces', 'cursive'],
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(26, 104, 94, 0.08), 0 8px 24px -6px rgba(26, 104, 94, 0.08)',
        lift: '0 10px 30px -12px rgba(26, 104, 94, 0.25)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'slide-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'slide-up': 'slide-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
