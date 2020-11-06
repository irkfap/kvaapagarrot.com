import * as path from 'path';
import {fileURLToPath} from 'url';
import fastify, {FastifyReply, FastifyRequest} from 'fastify';
import {FastifyError, ValidationResult} from 'fastify-error';
import fastifyStatic from 'fastify-static';
import pointOfView from 'point-of-view';
import * as eta from 'eta';

const PORT = process.env['PORT'] || '3000';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

const isDev = process.env['NODE_ENV'] === 'development';

interface ErrorPayload {
  statusCode: number,
  message: string,
  error?: string,
  stack?: string,
  validation?: ValidationResult[],
}

interface ServerRequest extends FastifyRequest {
  timerStart: bigint;
}

const server = fastify();

server.decorateRequest('timerStart', '');

server.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply): void => {
  const statusCode = error.statusCode || 500;

  // Log error
  if (statusCode >= 500) {
    reply.log.error(error)
  } else if (statusCode >= 400) {
    reply.log.info(error)
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

server.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
  reply.status(404).send({
    url: request.url,
    method: request.method,
    error: "Not Found",
    statusCode: 404,
  });
});

server.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/',
  wildcard: false,
});

eta.configure({
  // Whether or not to cache templates if `name` or `filename` is passed
  cache: !isDev,
  useWith: false,
});

server.register(pointOfView, {
  engine: {
    eta
  },
  root: path.join(__dirname, '..', 'templates'),
  viewExt: 'eta',
});

server.addHook('preHandler', function (_request, reply, done) {
  reply.locals = {
    isDev,
  };
  done();
});

server.addHook('onRequest', (request, _reply, done) => {
  (request as ServerRequest).timerStart = process.hrtime.bigint();
  done();
});

server.addHook('onSend', (request, reply, _payload, done) => {
  const timerEnd = process.hrtime.bigint();
  const timerStart = (request as ServerRequest).timerStart;
  let duration = Number(timerEnd - timerStart) / 1000000; // ms
  duration = Math.round((duration + Number.EPSILON) * 100) / 100;
  reply.header('Server-Timing', `total;dur=${duration}`);
  done();
});

server.addHook('onResponse', (request, reply, done) => {
  if (isDev) {
    const duration = Math.round((reply.getResponseTime() + Number.EPSILON) * 100) / 100;
    console.debug(`${duration}ms\t${request.method}\t${request.url}`);
  }
  done();
});

server.get('/_ah/warmup', async (_request: FastifyRequest, reply: FastifyReply) => {
  // Handle warmup logic.
  // ...

  reply
    .header('Content-Type', 'application/json; charset=utf-8')
    .send({ success: true })
});

server.get('/ping', async (_request: FastifyRequest, reply: FastifyReply) => {
  if (!isDev) {
    reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  reply
    .header('Content-Type', 'application/json; charset=utf-8')
    .send({ success: true, env: process.env['NODE_ENV'] })
});

server.head('/ping', async (_request: FastifyRequest, reply: FastifyReply) => {
  reply.status(200).send();
});

server.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
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
