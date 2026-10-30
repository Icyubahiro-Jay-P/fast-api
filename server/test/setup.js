import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/db.js';
import { Customer, Order, Product } from '../src/models/index.js';

beforeAll(async () => {
  const databaseName = new URL(env.mongoUri).pathname;

  if (!databaseName.endsWith('_test')) {
    throw new Error('Refusing to run tests against a database whose name does not end in _test.');
  }

  await connectDB();
  await Promise.all([Customer.init(), Product.init(), Order.init()]);
});

beforeEach(async () => {
  await Promise.all([Order.deleteMany({}), Product.deleteMany({}), Customer.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await disconnectDB();
});
