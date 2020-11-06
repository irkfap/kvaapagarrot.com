import * as path from 'path';
import {fileURLToPath} from 'url';
import fastify from 'fastify';
import {FastifyError} from 'fastify-error';
import fastifyStatic from 'fastify-static';
import pointOfView from 'point-of-view';
import * as eta from 'eta';
import glob from 'tiny-glob';
import {
  symbolTimerStart,
  ErrorPayload
} from './types';

const PORT = process.env['PORT'] || '3000';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATIC_DIR = path.join(__dirname, '..', 'public');
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');
const TPL_EXTENSION = 'eta';

const isDev = process.env['NODE_ENV'] === 'development';

const server = fastify();

server.decorateRequest(symbolTimerStart, null);

server.setErrorHandler((error: FastifyError, _request, reply): void => {
  const statusCode = error.statusCode || 500;

  // Log error
  if (statusCode >= 500) {
    console.error(error);
    // reply.log.error(error);
  } else if (statusCode >= 400) {
    console.info(error);
    // reply.log.info(error);
  }

  const payload: ErrorPayload = {
    statusCode,
    message : error.message,
  };

  if (isDev) {
    payload.stack = error.stack;
    payload.validation = error.validation;
  }

  // Send error response
  reply.status(statusCode).send(payload);
});

server.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    url: request.url,
    method: request.method,
    error: "Not Found",
    statusCode: 404,
  });
});

server.register(fastifyStatic, {
  root: STATIC_DIR,
  prefix: '/',
  wildcard: false,
});

eta.configure({
  // Whether or not to cache templates if `name` or `filename` is passed
  cache: !isDev,
  views: TEMPLATE_DIR,
  useWith: false,
});

server.register(pointOfView, {
  engine: {
    eta
  },
  root: TEMPLATE_DIR,
  viewExt: TPL_EXTENSION,
});

server.addHook('preHandler', function (_request, reply, done) {
  reply.locals = {
    isDev,
  };
  done();
});

server.addHook('onRequest', (request, _reply, done) => {
  request[symbolTimerStart] = process.hrtime.bigint();
  done();
});

server.addHook('onSend', (request, reply, _payload, done) => {
  const timerEnd = process.hrtime.bigint();
  const timerStart = request[symbolTimerStart];
  let duration = Number(timerEnd - timerStart) / 1e6; // ms
  duration = Math.round((duration + Number.EPSILON) * 1e3) / 1e3;
  reply.header('Server-Timing', `render;dur=${duration}`);
  done();
});

server.addHook('onResponse', (request, reply, done) => {
  if (isDev) {
    const duration = Math.round((reply.getResponseTime() + Number.EPSILON) * 1e3) / 1e3;
    console.debug(`${duration}ms\t${request.method} ${request.url}`);
  }
  done();
});

/**
 * https://cloud.google.com/appengine/docs/standard/nodejs/how-instances-are-managed#warmup_requests
 * Warmup requests are a specific type of loading request that load application code into an instance ahead of time,
 * before any live requests are made. Manual or basic scaling instances do not receive an `/_ah/warmup` request.
 */
server.get('/_ah/warmup', async (_request, reply) => {
  console.info('Warmup initiated');

  // Pre-cache all templates to memory
  if (eta.config.cache) {
    console.info('Precaching templates...');

    const templates = await glob(`**/*.${TPL_EXTENSION}`, {
      cwd: TEMPLATE_DIR,
    });

    const results = templates.map((async tpl => {
      const res = await eta.renderFile(tpl, {});
      console.info(`${res.length}\t${tpl}`);
    }));

    await Promise.all(results);
    console.info('Done.');
  }

  reply
    .header('Content-Type', 'application/json; charset=utf-8')
    .send({ success: true })
});

server.get('/ping', async (_request, reply) => {
  if (!isDev) {
    reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  reply
    .header('Content-Type', 'application/json; charset=utf-8')
    .send({ success: true, env: process.env['NODE_ENV'] })
});

server.head('/ping', async (_request, reply) => {
  reply.status(200).send();
});

server.get('/', async (_request, reply) => {
  if (!isDev) {
    reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  reply.view('index', {});
});

server.listen(PORT, (err, address) => {
  if(err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
