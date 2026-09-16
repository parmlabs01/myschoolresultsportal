import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101828',
        navy: {
          DEFAULT: '#1E3A5F',
          deep: '#0F2647',
        },
        paper: '#F7F8FA',
        line: '#D8DEE7',
        accent: {
          DEFAULT: '#2F6FED',
          hover: '#2559C4',
        },
        success: '#1F8A55',
        danger: '#C4392B',
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        prose: '38rem',
      },
    },
  },
  plugins: [],
} satisfies Config
