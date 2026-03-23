/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './src/**/*.css',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Mulish'],
        mulish: ['Mulish'],
      },
      colors: {
        /** Modo oscuro — MVP Figma (nodo Sign Up / Login dark) */
        night: {
          950: '#050f2f',
          900: '#0a1738',
          800: '#0c142d',
          700: '#152042',
          muted: '#8e9aaf',
        },
        primary: {
          50: '#F1F0FE',
          100: '#E4E1FD',
          200: '#C8C3FB',
          300: '#ACA5F9',
          400: '#9087F7',
          500: '#7469F4',
          600: '#685CF0',
          700: '#5249C0',
          800: '#3D3790',
          900: '#292460',
        },
      },
    },
  },
  plugins: [],
};
