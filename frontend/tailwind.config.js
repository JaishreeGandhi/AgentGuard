/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0a0d14",
        surface: {
          DEFAULT: "#101622",
          border: "#1e293b",
          inset: "#161f30",
          hover: "#1a2336",
        },
        accent: {
          cyan: "#06b6d4",
          cyanHover: "#0891b2",
          purple: "#8b5cf6",
        },
        status: {
          passed: "#10b981",
          failed: "#f43f5e",
          warning: "#f59e0b",
          untested: "#64748b",
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}

