import typescript from '@rollup/plugin-typescript';
import {terser} from 'rollup-plugin-terser';
// import run from '@rollup/plugin-run';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const isWatchMode = process.env['ROLLUP_WATCH'] === 'true';
const isDev = process.env['NODE_ENV'] === 'development';

export default {
  input: 'src/main.ts',

  output: [{
    file: 'dist/bundle.js',
    format: 'cjs',
    // Use terser for production only
    plugins: [!isDev && terser()],
    sourcemap: true
  }],

  external: [
    'assert',
    'buffer',
    'console',
    'crypto',
    'depd',
    'events',
    'fs',
    'glob',
    'http',
    'http2',
    'https',
    'tiny-lru',
    'net',
    'os',
    'path',
    'querystring',
    'readable-stream',
    'semver',
    'stream',
    'tty',
    'url',
    'vm',
    'util',
  ],

  plugins: [
    typescript(),
    commonjs(),
    json(),
    nodeResolve({
      preferBuiltins: true
    }),

    // isWatchMode && run({
    //   execArgv: ['-r', 'source-map-support/register']
    // }),
  ],

  watch: {
    chokidar: true,
    // include and exclude govern which files to watch. by
    // default, all dependencies will be watched
    exclude: ['node_modules/**']
  }
};
