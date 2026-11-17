import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(
    `[KCP Sports Server] Running in ${env.NODE_ENV} mode on http://${env.HOST}:${env.PORT}`
  );
});

async function gracefulShutdown(signal: string) {
  console.log(`[KCP Sports Server] Received ${signal}. Closing HTTP server and DB pool...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
