import {join as pathJoin} from 'path';
import fastify, {FastifyReply, FastifyRequest} from 'fastify';
import {FastifyError} from 'fastify-error';
import fastifyStatic from 'fastify-static';
import pointOfView from 'point-of-view';
import * as eta from 'eta';
import glob from 'fast-glob';
import {symbolTimerStart, ErrorPayload} from './types';
import {getUserCountry, getUserIp} from './helpers';
import {trapRoutes, getTrapped} from './trapRoutes';
import {LRU} from "./lru";

const PORT = process.env['PORT'] || '3000';
const CWD = process.cwd();
const STATIC_DIR = pathJoin(CWD, 'public');
const TEMPLATE_DIR = pathJoin(CWD, 'templates');
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

eta.configure({
  // Whether or not to cache templates if `name` or `filename` is passed
  cache: !isDev,
  views: TEMPLATE_DIR,
  useWith: false,
});

void server.register(pointOfView, {
  engine: {
    eta,
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
  void reply.header('Server-Timing', `render;dur=${duration}`);
  done();
});

server.addHook(
  'onResponse',
  (request: FastifyRequest, reply: FastifyReply, done) => {
    if (isDev) {
      const duration =
        Math.round((reply.getResponseTime() + Number.EPSILON) * 1e3) / 1e3;
      console.debug(`${duration}ms\t${request.method} ${request.url}`);
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
  console.info('Warmup initiated');

  // Pre-cache all templates to memory
  if (eta.config.cache) {
    console.info('Precaching templates...');

    const templates = await glob(`**/*.${TPL_EXTENSION}`, {
      braceExpansion: false,
      caseSensitiveMatch: false,
      cwd: TEMPLATE_DIR,
      extglob: false,
      followSymbolicLinks: false,
      onlyFiles: true,
    });

    for (const tpl of templates) {
      const rendered = (await eta.renderFile(tpl, {})) as string;
      console.info(`${rendered.length}\t${tpl}`);
    }

    console.info('Done.');
  }

  void reply
    .header('Content-Type', 'application/json; charset=utf-8')
    .send({success: true});
});

server.get('/ping', async (request: FastifyRequest, reply: FastifyReply) => {
  if (!isDev) {
    void reply.header(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }

  void reply.header('Content-Type', 'application/json; charset=utf-8').send({
    success: true,
    env: process.env['NODE_ENV'],
    user: {
      ip: getUserIp(request),
      country: getUserCountry(request),
    },
  });
});

server.head('/ping', async (request, reply) => {
  void reply
    .header('X-Client-Ip', getUserIp(request))
    .header('X-Client-Country', getUserCountry(request))
    .status(200)
    .send();
});

server.get('/', async (_request, reply) => {
  if (!isDev) {
    void reply.header(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }

  void reply.view('index', {});
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
  // console.log(routes);

  routes.forEach((url) => {
    server.route({
      method: ['GET', 'POST'],
      url,
      handler: redirectTrap,
    });
  });
};
createTrapRoutes();

// server.ready(() => {
//   console.log(server.printRoutes());
// });

server.listen(PORT, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
