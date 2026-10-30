import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { makeCustomer, makeOrder, makeProduct } from './helpers.js';

const app = createApp();

describe('customers API', () => {
  it('creates a customer and normalizes email casing', async () => {
    const response = await request(app).post('/api/v1/customers').send({
      name: '  Ada Lovelace  ',
      email: 'ADA@Example.COM',
      phone: ' +1 555 0100 ',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+1 555 0100',
      status: 'active',
    });
    expect(response.body.id).toMatch(/^[0-9a-f]{24}$/);
    expect(response.body._id).toBeUndefined();
    expect(response.body.__v).toBeUndefined();
  });

  it('rejects duplicate emails with a 409 response', async () => {
    await makeCustomer({ email: 'duplicate@example.com' });

    const response = await request(app).post('/api/v1/customers').send({
      name: 'Second Customer',
      email: 'DUPLICATE@example.com',
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('duplicate_value');
    expect(response.body.error.details).toMatchObject({ field: 'email' });
  });

  it('rejects invalid and unknown fields', async () => {
    const response = await request(app).post('/api/v1/customers').send({
      name: 'A',
      email: 'not-an-email',
      role: 'admin',
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('validation_error');
    expect(response.body.error.details.length).toBeGreaterThanOrEqual(2);
  });

  it('lists, searches, filters, and paginates customers', async () => {
    await makeCustomer({ name: 'Amara Okafor', email: 'amara@example.com', status: 'active' });
    await makeCustomer({ name: 'Liam Chen', email: 'liam@example.com', status: 'inactive' });
    await makeCustomer({ name: 'Sofia Reyes', email: 'sofia@example.com', status: 'active' });

    const filtered = await request(app).get('/api/v1/customers').query({
      search: 'amara',
      status: 'active',
    });

    expect(filtered.status).toBe(200);
    expect(filtered.body.items).toHaveLength(1);
    expect(filtered.body.items[0].name).toBe('Amara Okafor');

    const paged = await request(app).get('/api/v1/customers').query({ page: 2, pageSize: 2 });

    expect(paged.status).toBe(200);
    expect(paged.body.items).toHaveLength(1);
    expect(paged.body).toMatchObject({ page: 2, pageSize: 2, total: 3, pages: 2 });
  });

  it('retrieves, updates, and deletes a customer', async () => {
    const customer = await makeCustomer({ name: 'Original Name' });

    const fetched = await request(app).get(`/api/v1/customers/${customer.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.name).toBe('Original Name');

    const updated = await request(app)
      .patch(`/api/v1/customers/${customer.id}`)
      .send({ name: 'Updated Name', status: 'inactive' });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ name: 'Updated Name', status: 'inactive' });

    const deleted = await request(app).delete(`/api/v1/customers/${customer.id}`);
    expect(deleted.status).toBe(204);

    const missing = await request(app).get(`/api/v1/customers/${customer.id}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('customer_not_found');
  });

  it('prevents deleting a customer referenced by an order', async () => {
    const customer = await makeCustomer();
    const product = await makeProduct();
    await makeOrder({ customer, items: [{ product, quantity: 1 }] });

    const response = await request(app).delete(`/api/v1/customers/${customer.id}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('customer_in_use');
  });

  it('rejects malformed IDs and empty updates', async () => {
    const badId = await request(app).get('/api/v1/customers/not-an-id');
    expect(badId.status).toBe(400);
    expect(badId.body.error.code).toBe('invalid_id');

    const customer = await makeCustomer();
    const emptyUpdate = await request(app).patch(`/api/v1/customers/${customer.id}`).send({});
    expect(emptyUpdate.status).toBe(422);
  });
});
