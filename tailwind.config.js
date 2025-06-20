/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // This is the key line!
  ],
  theme: {
    extend: {
      fontFamily: {
        'huninn': ['"Huninn"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
