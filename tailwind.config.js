/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",       // sve komponente u app folderu
    "./pages/**/*.{js,ts,jsx,tsx}",     // ako koristiš pages folder
    "./components/**/*.{js,ts,jsx,tsx}" // sve komponente
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
