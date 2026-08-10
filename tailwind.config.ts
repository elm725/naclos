import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        naclos: {
          bg: '#1a1a1a',
          accent: '#d92d20',
        },
      },
    },
  },
  plugins: [],
};
export default config;
