/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Marketing-aligned tokens
        brand: { DEFAULT: "#FD5A24", ink: "#0b0c0d" },
        surface: { bg: "#0b0c0d", panel: "#10131a", panel2: "#151924" },
        ink: { DEFAULT: "#f4f6f8", muted: "#aeb6c3" },
        line: "#1c2230",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
};