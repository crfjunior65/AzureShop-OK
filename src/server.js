const config = require('./config');
const { createRepository } = require('./db');
const { createApp } = require('./app');

async function main() {
  const repository = await createRepository();
  const server = createApp(repository).listen(config.port, '0.0.0.0', () => {
    console.log(`Imersão Arquiteto Azure disponível na porta ${config.port} (${repository.provider}).`);
  });
  async function shutdown() { server.close(async () => { await repository.close(); process.exit(0); }); }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => { console.error(error); process.exit(1); });
