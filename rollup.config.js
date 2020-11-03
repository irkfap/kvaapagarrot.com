import typescript from '@rollup/plugin-typescript';
import {terser} from 'rollup-plugin-terser';
import run from '@rollup/plugin-run';

const dev = process.env.ROLLUP_WATCH === 'true';

export default {
  input: 'src/main.ts',

  output: [{
    dir: 'dist',
    format: 'es',
    // @fixme use terser for production only
    plugins: [terser()],
    sourcemap: true
  }],

  external: [
    'path',
    'url',
    'fastify',
    'fastify-static'
  ],

  plugins: [
    typescript(),
    dev && run({
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
