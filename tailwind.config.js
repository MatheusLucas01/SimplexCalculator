/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",  // ← Já inclui JSX
    "./public/index.html"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}