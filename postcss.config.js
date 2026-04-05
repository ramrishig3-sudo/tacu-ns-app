export default {
  plugins: {
    '@tailwindcss/postcss': {},
    'postcss-preset-env': {
      features: {
        'oklab-function': true,
      },
    },
    'autoprefixer': {},
  },
};
