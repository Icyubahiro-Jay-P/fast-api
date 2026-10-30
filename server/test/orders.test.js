import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { makeCustomer, makeOrder, makeProduct } from './helpers.js';

const app = createApp();

describe('orders API', () => {
  it('creates an order with product snapshots and a computed total', async () => {
    const customer = await makeCustomer({ name: 'Amara Okafor' });
    const firstProduct = await makeProduct({ name: 'Headphones', price: 50 });
    const secondProduct = await makeProduct({ name: 'Cable', price: 12.5 });

    const response = await request(app).post('/api/v1/orders').send({
      customerId: customer.id,
      items: [
        { productId: firstProduct.id, quantity: 2 },
        { productId: secondProduct.id, quantity: 3 },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.body.orderNumber).toMatch(/^ORD-\d{8}-[A-F0-9]{8}$/);
    expect(response.body.customerName).toBe('Amara Okafor');
    expect(response.body.totalAmount).toBe(137.5);
    expect(response.body.status).toBe('pending');
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0]).toMatchObject({
      productName: 'Headphones',
      quantity: 2,
      unitPrice: 50,
      lineTotal: 100,
    });
  });

  it('rejects an unknown customer or product', async () => {
    const customer = await makeCustomer();
    const product = await makeProduct();

    const unknownCustomer = await request(app).post('/api/v1/orders').send({
      customerId: '64b64b64b64b64b64b64b64b',
      items: [{ productId: product.id, quantity: 1 }],
    });

    expect(unknownCustomer.status).toBe(404);
    expect(unknownCustomer.body.error.code).toBe('customer_not_found');

    const unknownProduct = await request(app).post('/api/v1/orders').send({
      customerId: customer.id,
      items: [{ productId: '64b64b64b64b64b64b64b64b', quantity: 1 }],
    });

    expect(unknownProduct.status).toBe(404);
    expect(unknownProduct.body.error.code).toBe('product_not_found');
    expect(unknownProduct.body.error.details.missingProductIds).toEqual([
      '64b64b64b64b64b64b64b64b',
    ]);
  });

  it('rejects duplicate products, empty items, and invalid quantities', async () => {
    const customer = await makeCustomer();
    const product = await makeProduct();

    const duplicate = await request(app).post('/api/v1/orders').send({
      customerId: customer.id,
      items: [
        { productId: product.id, quantity: 1 },
        { productId: product.id, quantity: 2 },
      ],
    });

    expect(duplicate.status).toBe(422);
    expect(duplicate.body.error.code).toBe('validation_error');

    const empty = await request(app).post('/api/v1/orders').send({
      customerId: customer.id,
      items: [],
    });
    expect(empty.status).toBe(422);

    const invalidQuantity = await request(app).post('/api/v1/orders').send({
      customerId: customer.id,
      items: [{ productId: product.id, quantity: 0 }],
    });
    expect(invalidQuantity.status).toBe(422);
  });

  it('updates status and recomputes totals for replacement items', async () => {
    const customer = await makeCustomer();
    const firstProduct = await makeProduct({ price: 20 });
    const secondProduct = await makeProduct({ price: 35 });
    const order = await makeOrder({
      customer,
      items: [{ product: firstProduct, quantity: 2 }],
      status: 'pending',
    });

    const statusUpdate = await request(app)
      .patch(`/api/v1/orders/${order.id}`)
      .send({ status: 'paid' });

    expect(statusUpdate.status).toBe(200);
    expect(statusUpdate.body.status).toBe('paid');
    expect(statusUpdate.body.totalAmount).toBe(40);

    const itemsUpdate = await request(app)
      .patch(`/api/v1/orders/${order.id}`)
      .send({ items: [{ productId: secondProduct.id, quantity: 3 }] });

    expect(itemsUpdate.status).toBe(200);
    expect(itemsUpdate.body.totalAmount).toBe(105);
    expect(itemsUpdate.body.items).toHaveLength(1);
    expect(itemsUpdate.body.items[0].productName).toBe(secondProduct.name);
  });

  it('lists and filters orders', async () => {
    const firstCustomer = await makeCustomer({ name: 'Amara Okafor' });
    const secondCustomer = await makeCustomer({ name: 'Liam Chen' });
    const product = await makeProduct({ price: 10 });

    await makeOrder({
      customer: firstCustomer,
      items: [{ product, quantity: 1 }],
      status: 'paid',
    });
    await makeOrder({
      customer: firstCustomer,
      items: [{ product, quantity: 2 }],
      status: 'completed',
    });
    await makeOrder({
      customer: secondCustomer,
      items: [{ product, quantity: 3 }],
      status: 'paid',
    });

    const byStatus = await request(app).get('/api/v1/orders').query({ status: 'paid' });
    expect(byStatus.status).toBe(200);
    expect(byStatus.body.items).toHaveLength(2);

    const byCustomer = await request(app)
      .get('/api/v1/orders')
      .query({ customerId: firstCustomer.id });
    expect(byCustomer.body.items).toHaveLength(2);

    const bySearch = await request(app).get('/api/v1/orders').query({ search: 'Liam' });
    expect(bySearch.body.items).toHaveLength(1);

    const paged = await request(app).get('/api/v1/orders').query({ page: 2, pageSize: 2 });
    expect(paged.body).toMatchObject({ page: 2, pageSize: 2, total: 3, pages: 2 });
    expect(paged.body.items).toHaveLength(1);
  });

  it('retrieves and deletes an order', async () => {
    const customer = await makeCustomer();
    const product = await makeProduct();
    const order = await makeOrder({ customer, items: [{ product, quantity: 1 }] });

    const fetched = await request(app).get(`/api/v1/orders/${order.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(order.id);

    const deleted = await request(app).delete(`/api/v1/orders/${order.id}`);
    expect(deleted.status).toBe(204);

    const missing = await request(app).get(`/api/v1/orders/${order.id}`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('order_not_found');
  });
});
