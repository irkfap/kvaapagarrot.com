import fastify from 'fastify';

const PORT = process.env['PORT'] || '3000';

const server = fastify();

server.get('/_ah/warmup', async () => {
  // Handle warmup logic.
  return 'OK\n';
});

server.get('/', async () => {
  return 'OK\n';
});

server.listen(PORT, (err, address) => {
  if(err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
