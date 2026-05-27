/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a14',
          800: '#0f0f1e',
          700: '#1a1a2e',
          600: '#16213e',
          500: '#1f2a4a',
        },
        fraud: {
          low:    '#22c55e',
          medium: '#eab308',
          high:   '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
