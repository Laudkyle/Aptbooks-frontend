/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          deep: 'var(--color-brand-deep)',
          primary: 'var(--color-brand-primary)',
          light: 'var(--color-brand-light)'
        },
        bg: {
          main: 'var(--color-bg-main)'
        },
        text: {
          body: 'var(--color-text-body)'
        }
      }
    }
  },
  plugins: []
};
