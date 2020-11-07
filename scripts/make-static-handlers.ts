import {join as pathJoin, basename, extname} from 'path';
import glob from 'fast-glob';
import {Options} from 'fast-glob/out/settings';
import yaml from 'js-yaml';

/**
 * App Engine static route definition
 *
 * https://cloud.google.com/appengine/docs/standard/nodejs/serving-static-files#configuring_your_static_file_handlers
 * https://cloud.google.com/appengine/docs/standard/nodejs/config/appref#handlers_element
 */
interface RouteType {
  url: string,
  static_files: string,
  upload: string,
  mime_type?: string,
  expiration?: string,
  http_headers?: { [key: string]: string  },
}

const STATIC_DIR = pathJoin(process.cwd(), 'public');

type RouteFlagsType = { [key: string]: string | {[key:string]: string} };
const ROUTE_FLAGS: RouteFlagsType = {
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

const createRoute = (relPath: string, expand? : boolean): RouteType => {
  let routeFlags = {};
  if (expand) {
    const extGlob = `*${extname(relPath)}`;
    if (typeof ROUTE_FLAGS[extGlob] === 'string') {
      routeFlags = {mime_type: ROUTE_FLAGS[extGlob]};
    } else {
      const fName = basename(relPath);
      routeFlags = ROUTE_FLAGS[fName];
    }
  }

  return {
    url: `/${relPath}`,
    static_files: `public/${relPath}`,
    upload: `public/${relPath}`,
    ...routeFlags,
  };
};

(async () => {
  let routes: RouteType[] = [];

  // const pattern = '**/('+Object.keys(ROUTE_FLAGS).join('|')+')';
  const pattern = Object.keys(ROUTE_FLAGS).map(k => `**/${k}`);

  const filesKnown = await glob(pattern , GLOB_OPTIONS);
  routes = routes.concat(
      filesKnown.map(path => createRoute(path, true))
  );

  const filesAll = await glob('**/*.*' , {
    ...GLOB_OPTIONS,
    ignore: IGNORE_FILES.concat(pattern),
  });
  routes = routes.concat(
    filesAll.map(path => createRoute(path))
  );

  const routesYaml = yaml.safeDump({handlers: routes}, {skipInvalid: true});

  console.log(routesYaml);
})();