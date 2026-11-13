/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF4FF',
          100: '#D9E6FF',
          200: '#BBCFFF',
          300: '#8DABFF',
          400: '#5B7FFF',
          500: '#3B5BFF',
          600: '#1E36F5',
          700: '#1728E1',
          800: '#1922B6',
          900: '#1B238F',
        },
        mint: {
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
        coral: {
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
        },
        surface: {
          light: '#F8FAFC',
          dark: '#0F172A',
          card: '#FFFFFF',
          'card-dark': '#1E293B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
