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

const server = fastify();

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
  useWith: true, // Make data available on the global object instead of varName
});

server.register(pointOfView, {
  engine: {
    eta
  },
  root: path.join(__dirname, '..', 'templates'),
  viewExt: 'eta',
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
