/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        surface: "#0f1115",
        "surface-accent": "#1a1d23",
        primary: "#6366f1",
        secondary: "#22d3ee",
        accent: "#10b981",
        risk: "#ef4444",
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-gradient': 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(34, 211, 238, 0.1) 0px, transparent 50%)',
      }
    },
  },
  plugins: [],
}
