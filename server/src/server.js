import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './db.js';

async function start() {
  await connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`CEDO API listening on http://localhost:${env.port}`);
    console.log(`Health check: http://localhost:${env.port}/api/health`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received, shutting down.`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('Failed to start CEDO API:', error.message);
  process.exit(1);
});
