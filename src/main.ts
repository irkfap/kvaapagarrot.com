import * as path from 'path';
import {fileURLToPath} from "url";
import fastify, {FastifyReply, FastifyRequest} from 'fastify';
import fastifyStatic from 'fastify-static';

const PORT = process.env['PORT'] || '3000';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

const server = fastify();

server.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/',
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
