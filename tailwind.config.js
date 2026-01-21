/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette (mapped to CSS variables so you can theme without rebuild)
        brand: {
          deep: "rgb(var(--brand-deep-rgb) / <alpha-value>)",
          primary: "rgb(var(--brand-primary-rgb) / <alpha-value>)",
          light: "rgb(var(--brand-light-rgb) / <alpha-value>)",
        },
        // App surfaces / borders (used heavily across layouts)
        surface: {
          1: "var(--app-surface)",
          2: "var(--app-surface-weak)",
        },
        border: {
          subtle: "var(--app-border)",
        },
        bg: {
          main: "rgb(var(--bg-main-rgb) / <alpha-value>)",
        },
        text: {
          body: "rgb(var(--text-body-rgb) / <alpha-value>)",
        },
        shadow: {
          soft: "var(--app-shadow-soft)",
        },
      },
    },
  },
  plugins: [],
};
