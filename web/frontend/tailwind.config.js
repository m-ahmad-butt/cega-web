/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        notion: {
          bg: "#ffffff",
          surface: "#f7f7f5",
          hover: "#efefed",
          border: "#e9e9e7",
          "border-strong": "#d3d1cb",
          text: "#37352f",
          muted: "#787774",
          faint: "#9b9a97",
          blue: "#37352f",
          "blue-hover": "#1a1917",
          "blue-soft": "#efefed",
          "blue-ink": "#37352f",
          green: "#448361",
          "green-soft": "#edf3ed",
          yellow: "#cb912f",
          "yellow-soft": "#fdecc8",
          pink: "#c14c8a",
          "pink-soft": "#f5e0e9",
          red: "#e03e3e",
          "red-soft": "#fdebec",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        notion: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
        "notion-lg": "0 8px 30px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        notion: "6px",
        "notion-lg": "10px",
      },
    },
  },
  plugins: [],
}
