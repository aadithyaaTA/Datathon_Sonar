/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FDFCFB',
          100: '#FBF9F5',
          200: '#F4EFEA',
          300: '#EBE5DC',
          400: '#DDD5C7',
          500: '#C7BBA8',
        },
        ink: {
          950: '#090D16',
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
        },
        marine: {
          900: '#0C2340',
          800: '#1A365D',
          700: '#1E40AF',
          600: '#2563EB',
          50: '#EFF6FF',
        },
        terracotta: {
          700: '#9F1239',
          600: '#BE123C',
          500: '#E11D48',
          50: '#FFF1F2',
        },
        ochre: {
          700: '#B45309',
          600: '#D97706',
          500: '#F59E0B',
          50: '#FFFBEB',
        }
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['Space Mono', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
