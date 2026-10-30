import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { corsOrigins, env } from './config/env.js';
import { health } from './controllers/healthController.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import apiRouter from './routes/index.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(currentDirectory, '../../client/dist');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: corsOrigins() }));
  app.use(express.json({ limit: '100kb' }));

  if (!env.isTest) {
    app.use(morgan('dev'));
  }

  app.get('/api', (_req, res) => {
    res.json({
      name: 'CEDO API',
      version: 'v1',
      health: '/api/health',
      baseUrl: '/api/v1',
    });
  });

  app.get('/api/health', health);
  app.use('/api/v1', apiRouter);
  app.use('/api', notFound);

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.json({
        name: 'CEDO API',
        message: 'API is running. Start the React client with npm run dev.',
        health: '/api/health',
      });
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
