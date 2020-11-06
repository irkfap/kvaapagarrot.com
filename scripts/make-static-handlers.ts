import {join as pathJoin} from 'path';
import glob from 'fast-glob';
import {Options} from 'fast-glob/out/settings';

const STATIC_DIR = pathJoin(process.cwd(), 'public');

const ADD_MIME_TYPES = {
  'site.webmanifest' : {mime_type: 'application/json', expiration: '10m'},
  '*.ico' : 'image/x-icon',
  'robots.txt': {expiration: '1s'},
  'sitemap.xml': {expiration: '1s'},
  '*.eot' : 'application/vnd.ms-fontobject',
  '*.ttf' : 'font/ttf',
  '*.woff' : 'font/woff',
  '*.woff2' : 'font/woff2',
};

const IGNORE_FILES = [
  '**/.DS_Store',
  '**/LICENSE.txt',
  '**/config.json'
];

const GLOB_OPTIONS: Options = {
  braceExpansion: false,
  caseSensitiveMatch: false,
  cwd: STATIC_DIR,
  extglob: false,
  followSymbolicLinks: false,
  ignore: IGNORE_FILES,
  onlyFiles: true,
};

(async () => {

  // const pattern = '**/('+Object.keys(ADD_MIME_TYPES).join('|')+')';
  const pattern = Object.keys(ADD_MIME_TYPES).map(k => `**/${k}`);

  const filesKnown = await glob(pattern , GLOB_OPTIONS);

  const filesAll = await glob('**/*.*' , {
    ...GLOB_OPTIONS,
    ignore: IGNORE_FILES.concat(pattern),
  });

  console.log(filesKnown.concat(filesAll));

})();