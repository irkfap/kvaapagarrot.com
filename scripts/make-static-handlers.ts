import * as path from 'path';
import {fileURLToPath} from 'url';
import glob from 'tiny-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATIC_DIR = path.join(__dirname, '..', '..', 'public');

(async () => {

  const templates = await glob(`**/*.*`, {
    cwd: STATIC_DIR,
  });

  console.log(templates);

})();