import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { makeCustomer, makeOrder, makeProduct } from './helpers.js';

const app = createApp();

describe('products API', () => {
  it('creates a product and normalizes its SKU', async () => {
    const response = await request(app).post('/api/v1/products').send({
      name: 'Studio Headphones',
      sku: 'aud-100',
      category: 'Audio',
      price: '189.50',
      stock: '12',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'Studio Headphones',
      sku: 'AUD-100',
      category: 'Audio',
      price: 189.5,
      stock: 12,
      status: 'active',
    });
  });

  it('rejects duplicate SKUs', async () => {
    await makeProduct({ sku: 'DUP-001' });

    const response = await request(app).post('/api/v1/products').send({
      name: 'Duplicate Product',
      sku: 'dup-001',
      category: 'Testing',
      price: 10,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('duplicate_value');
    expect(response.body.error.details).toMatchObject({ field: 'sku' });
  });

  it('validates price, stock, and SKU format', async () => {
    const response = await request(app).post('/api/v1/products').send({
      name: 'Bad Product',
      sku: 'bad sku!',
      category: 'Testing',
      price: 0,
      stock: -2,
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('validation_error');
  });

  it('filters products by category and price range', async () => {
    await makeProduct({ sku: 'AUD-001', category: 'Audio', price: 100 });
    await makeProduct({ sku: 'AUD-002', category: 'Audio', price: 300 });
    await makeProduct({ sku: 'DIS-001', category: 'Displays', price: 200 });

    const response = await request(app).get('/api/v1/products').query({
      category: 'audio',
      minPrice: 150,
      maxPrice: 350,
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].sku).toBe('AUD-002');
  });

  it('rejects an inverted price range', async () => {
    const response = await request(app)
      .get('/api/v1/products')
      .query({ minPrice: 500, maxPrice: 100 });

    expect(response.status).toBe(422);
    expect(response.body.error.details[0].path).toBe('minPrice');
  });

  it('retrieves, updates, and deletes a product', async () => {
    const product = await makeProduct({ stock: 2 });

    const fetched = await request(app).get(`/api/v1/products/${product.id}`);
    expect(fetched.status).toBe(200);

    const updated = await request(app)
      .patch(`/api/v1/products/${product.id}`)
      .send({ stock: 20, status: 'draft' });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ stock: 20, status: 'draft' });

    const deleted = await request(app).delete(`/api/v1/products/${product.id}`);
    expect(deleted.status).toBe(204);

    const missing = await request(app).get(`/api/v1/products/${product.id}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('product_not_found');
  });

  it('prevents deleting a product referenced by an order', async () => {
    const customer = await makeCustomer();
    const product = await makeProduct();
    await makeOrder({ customer, items: [{ product, quantity: 1 }] });

    const response = await request(app).delete(`/api/v1/products/${product.id}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('product_in_use');
  });
});
