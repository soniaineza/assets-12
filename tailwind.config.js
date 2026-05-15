/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          light: '#fdfcf8',
          dark: '#f4f1ea',
        },
        ink: {
          DEFAULT: '#1a1a1a',
          soft: '#4a4a4a',
          muted: '#8c8c8c',
        },
        ledger: {
          green: '#2d5a27',
          red: '#9b2c2c',
          amber: '#92400e',
        },
        rule: '#d1cfc7',
      },
    },
  },
  plugins: [],
}