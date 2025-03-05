const { spacing, fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        shortcut: '#58B1E4',
        durple: '#452B5B',
      },
      fontFamily: {
        sans: ['Titillium Web', ...fontFamily.sans],
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#334155',
            a: {
              color: '#2563eb',
              '&:hover': {
                color: '#1d4ed8',
              },
              code: { color: '#2563eb' },
            },
            'h2,h3,h4': {
              'scroll-margin-top': '100px',
              'scroll-snap-margin-top': '100px',
            },
            code: {
              color: '#334155',
              '&::before': {
                content: '"`"',
              },
              '&::after': {
                content: '"`"',
              },
            },
            'blockquote p:first-of-type::before': false,
            'blockquote p:last-of-type::after': false,
            img: {
              borderRadius: '8px',
            },
          },
        },
      },
    },
  },
  variants: {
    typography: ['dark'],
  },
  plugins: [require('@tailwindcss/typography')],
};
