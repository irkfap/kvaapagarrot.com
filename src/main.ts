import {join as pathJoin} from 'path';
import fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
} from 'fastify';
import {FastifyError} from 'fastify-error';
import fastifyStatic from 'fastify-static';
import pointOfView from 'point-of-view';
import * as eta from 'eta';
import {PartialConfig as EtaOptions} from 'eta/dist/types/config.d';
import glob from 'fast-glob';
import {ErrorPayload} from './types';
import {getUserCountry, trustedProxies} from './helpers';
import {trapRoutes, getTrapped} from './trapRoutes';
import {LRU} from './lru';

const PORT = process.env['PORT'] || '3000';
const CWD = process.cwd();
const STATIC_DIR = pathJoin(CWD, 'public');
const TEMPLATE_DIR = pathJoin(CWD, 'templates');
const TPL_EXTENSION = 'eta';
const isDev = process.env['NODE_ENV'] === 'development';

// https://github.com/fastify/fastify/blob/3634c6e01e4049e946da68647a6aaf5847dbccbd/docs/Server.md#trustproxy
const serverOptions: FastifyServerOptions = {
  logger: true,
  trustProxy: trustedProxies,
};

const server: FastifyInstance = fastify(serverOptions);

server.decorateRequest('timerStart', null);
server.decorateReply('locals', null);
server.decorate('isDev', isDev);

server.setErrorHandler((error: FastifyError, _request, reply): void => {
  const statusCode = error.statusCode || 500;

  // Log error
  if (statusCode >= 500) {
    reply.log.error(error.message);
  } else if (statusCode >= 400) {
    reply.log.info(error.message);
  }

  const payload: ErrorPayload = {
    statusCode,
    message: error.message,
  };

  if (isDev) {
    payload.stack = error.stack;
    payload.validation = error.validation;
  }

  // Send error response
  void reply.status(statusCode).send(payload);
});

server.setNotFoundHandler(
  (request: FastifyRequest, reply: FastifyReply): void => {
    void reply.status(404).send({
      url: request.url,
      method: request.method,
      error: 'Not Found',
      statusCode: 404,
    });
  },
);

void server.register(fastifyStatic, {
  root: STATIC_DIR,
  prefix: '/',
  wildcard: false,
});

// Define cache for templates
const lru = new LRU(1000);

const templateOptions: EtaOptions = {
  // Whether or not to cache templates if `name` or `filename` is passed
  cache: !isDev,
  views: TEMPLATE_DIR,
  // https://eta.js.org/docs/api/configuration
  useWith: false,
  // @ts-ignore: Eta cache implementation discrepancies: https://github.com/eta-dev/eta/blob/master/src/storage.ts
  templates: lru,
};

eta.configure(templateOptions);

void server.register(pointOfView, {
  engine: {
    eta,
  },
  // NB: For ETA engine, point-of-view recreates ETA config on each view() call:
  // https://github.com/siberex/point-of-view/blob/6a0a731d4bb50c5b3fca16698ab8c6c90aba4300/index.js#L531
  // So, it is important to pass here `templateOptions` with `templates` attr defined above
  // (for cache to work with our instance and not the default one).
  options: templateOptions,
  root: TEMPLATE_DIR,
  production: !isDev,
  viewExt: TPL_EXTENSION,
});

server.addHook('preHandler', function (_request, reply, done) {
  reply.locals = {
    isDev,
  };
  done();
});

server.addHook('onRequest', (request, _reply, done) => {
  request.timerStart = process.hrtime.bigint();
  done();
});

server.addHook('onSend', (request, reply, _payload, done) => {
  const timerEnd = process.hrtime.bigint();
  let duration = Number(timerEnd - request.timerStart) / 1e6; // ms
  duration = Math.round((duration + Number.EPSILON) * 1e3) / 1e3;
  void reply.header('Server-Timing', `render;dur=${duration}`);
  done();
});

server.addHook(
  'onResponse',
  (request: FastifyRequest, reply: FastifyReply, done) => {
    if (isDev) {
      const duration =
        Math.round((reply.getResponseTime() + Number.EPSILON) * 1e3) / 1e3;
      reply.log.info(`${duration}ms\t${request.method} ${request.url}`);
    }
    done();
  },
);

/**
 * https://cloud.google.com/appengine/docs/standard/nodejs/how-instances-are-managed#warmup_requests
 * Warmup requests are a specific type of loading request that load application code into an instance ahead of time,
 * before any live requests are made. Manual or basic scaling instances do not receive an `/_ah/warmup` request.
 */
server.get('/_ah/warmup', async (_request, reply) => {
  reply.log.info('Warmup initiated');

  // Pre-cache all templates to memory
  if (eta.config.cache) {
    reply.log.info('Precaching templates...');

    const templates = await glob(`**/*.${TPL_EXTENSION}`, {
      braceExpansion: false,
      caseSensitiveMatch: false,
      cwd: TEMPLATE_DIR,
      extglob: false,
      followSymbolicLinks: false,
      onlyFiles: true,
    });

    for (const filename of templates) {
      let res = false;
      try {
        const tplPath = pathJoin(TEMPLATE_DIR, filename);
        // NB: eta.config.templates === lru
        res = eta.config.templates.get(tplPath) !== undefined;

        if (!res) {
          eta.loadFile(tplPath, {
            // NB: Absolute path is used as a cache key:
            // https://github.com/eta-dev/eta/blob/47f8b0f/src/file-handlers.ts#L49
            // https://github.com/eta-dev/eta/blob/47f8b0f/src/file-handlers.ts#L72
            filename: tplPath,
          });
          res = eta.config.templates.get(tplPath) !== undefined;
        }
      } catch (err) {
        // do nothing
      }
      reply.log.info(`[${res ? '✓' : '×'}] ${filename}`);
    }
  }

  void reply.header('Content-Type', 'application/json; charset=utf-8');
  return {success: true};
});

server.get('/ping', async (request: FastifyRequest, reply: FastifyReply) => {
  if (!isDev) {
    void reply.header(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }

  void reply.header('Content-Type', 'application/json; charset=utf-8');
  return {
    success: true,
    env: process.env['NODE_ENV'],
    user: {
      ip: request.ip,
      country: getUserCountry(request),
    },
  };
});

server.head('/ping', async (request, reply) => {
  void reply
    .header('X-Client-Ip', request.ip)
    .header('X-Client-Country', getUserCountry(request))
    .status(204);
  return '';
});

server.get('/', async (_request, reply) => {
  if (!isDev) {
    void reply.header(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }

  return reply.view('index', {});
});

const redirectTrap = function (
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (isDev) {
    void reply.send({
      url: getTrapped(),
    });
  } else {
    void reply.redirect(302, getTrapped());
  }
};

const createTrapRoutes = function () {
  const wildcardRegex = /^\/?\*/;

  const routes = trapRoutes
    .split('\n')
    .filter((v: string) => v && v[0] !== '#')
    .map((v: string) => v.replace(wildcardRegex, '/:segment(.*)'));

  for (const url of routes) {
    server.route({
      method: ['GET', 'POST'],
      url,
      handler: redirectTrap,
    });
  }
};
createTrapRoutes();

server.listen(PORT, '0.0.0.0', (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
