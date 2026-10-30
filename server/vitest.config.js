import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/cedo_mern_test',
    },
    setupFiles: ['./test/setup.js'],
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
