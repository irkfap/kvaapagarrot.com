import fastify, {FastifyReply, FastifyRequest} from 'fastify';

const PORT = process.env['PORT'] || '3000';

const server = fastify();

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
