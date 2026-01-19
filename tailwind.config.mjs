export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf7ec',
          500: '#d8ae6b',
          900: '#0f1c3f',
        },
        secondary: '#1ad079',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        title: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
