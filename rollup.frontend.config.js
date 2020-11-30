import postcss from 'rollup-plugin-postcss';
import precss from 'precss';
import autoprefixer from 'autoprefixer';

export default {
  input: 'templates/style/main.pcss',

  output: [{
    dir: 'public/dist',
    format: 'es',
  }],

  plugins: [
    postcss({
      extract: true,
      plugins: [precss, autoprefixer],
      sourceMap: true,
    }),
  ],
};
