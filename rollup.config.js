import typescript from '@rollup/plugin-typescript';
import {terser} from 'rollup-plugin-terser';
import run from '@rollup/plugin-run';

const isWatchMode = process.env['ROLLUP_WATCH'] === 'true';
const isDev = process.env['NODE_ENV'] === 'development';

export default {
  input: 'src/main.ts',

  output: [{
    dir: 'dist',
    format: 'es',
    // Use terser for production only
    plugins: [!isDev && terser()],
    sourcemap: isDev
  }],

  external: [
    'path',
    'url',
    'fastify',
    'fastify-static',
    'point-of-view',
    'eta',
  ],

  plugins: [
    typescript(),
    isWatchMode && run({
      execArgv: ['-r', 'source-map-support/register']
    })
  ],

  watch: {
    chokidar: true,
    // include and exclude govern which files to watch. by
    // default, all dependencies will be watched
    exclude: ['node_modules/**']
  }
};
