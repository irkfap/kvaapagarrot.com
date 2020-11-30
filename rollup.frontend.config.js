import postcss from 'rollup-plugin-postcss';
import atImport from 'postcss-import';
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
      plugins: [atImport, precss, autoprefixer],
      sourceMap: true,
    }),
  ],

  watch: {
    chokidar: true,
    exclude: ['node_modules/**'],
  },
};
