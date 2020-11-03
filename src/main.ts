import * as path from 'path';
import {fileURLToPath} from 'url';
import fastify, {FastifyReply, FastifyRequest} from 'fastify';
import {FastifyError, ValidationResult} from 'fastify-error';
import fastifyStatic from 'fastify-static';

const PORT = process.env['PORT'] || '3000';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

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

  if (process.env['NODE_ENV'] === 'development') {
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

server.get('/_ah/warmup', async () => {
  // Handle warmup logic.
  return 'OK';
});

server.get('/ping', async (_request: FastifyRequest, reply: FastifyReply) => {
  reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return 'OK';
});

server.listen(PORT, (err, address) => {
  if(err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
