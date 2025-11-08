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
        // tradecard brand
        brand: {
          50:  "#FFF3ED",
          100: "#FFE6DA",
          200: "#FFC4B0",
          300: "#FFA287",
          400: "#FF7F5D",
          500: "#FD5A24", // primary
          600: "#E04F20",
          700: "#B23E19",
          800: "#7F2C12",
          900: "#4C1A0B",
          DEFAULT: "#FD5A24",
          ink: "#0b0c0d",
        },

        // Marketing-aligned neutrals
        surface: { bg: "#0b0c0d", panel: "#10131a", panel2: "#151924" },
        ink: { DEFAULT: "#f4f6f8", muted: "#aeb6c3" },
        line: "#1c2230",
      },

      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },

      ringColor: {
        brand: "#FD5A24",
      },

      boxShadow: {
        "brand-ring": "0 0 0 3px rgba(253,90,36,0.20)",
      },
    },
  },
  plugins: [],
};