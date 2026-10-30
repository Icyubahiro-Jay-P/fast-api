import { Customer, Order, Product } from '../models/index.js';
import { connectDB, disconnectDB } from '../db.js';
import { roundMoney } from '../utils/numbers.js';
import { generateOrderNumber } from '../utils/orderNumber.js';

const customers = [
  { name: 'Amara Okafor', email: 'amara@northwind.co', phone: '+1 415 555 0131', status: 'active' },
  { name: 'Liam Chen', email: 'liam@bluepeak.io', phone: '+1 206 555 0172', status: 'active' },
  { name: 'Sofia Reyes', email: 'sofia@atlaslabs.dev', phone: '+1 512 555 0184', status: 'active' },
  { name: 'Noah Williams', email: 'noah@fieldwork.app', phone: '+1 312 555 0109', status: 'inactive' },
  { name: 'Priya Nair', email: 'priya@lumenstudio.co', phone: '+1 646 555 0166', status: 'active' },
  { name: 'Ethan Brooks', email: 'ethan@stonebridge.co', phone: '+1 720 555 0147', status: 'active' },
];

const products = [
  { name: 'Studio Headphones', sku: 'AUD-001', category: 'Audio', price: 189, stock: 24, status: 'active' },
  { name: 'Wireless Earbuds', sku: 'AUD-002', category: 'Audio', price: 129, stock: 38, status: 'active' },
  { name: 'Desk Microphone', sku: 'AUD-003', category: 'Audio', price: 149, stock: 12, status: 'active' },
  { name: '27-inch 4K Monitor', sku: 'DIS-001', category: 'Displays', price: 549, stock: 9, status: 'active' },
  { name: 'Portable Monitor', sku: 'DIS-002', category: 'Displays', price: 279, stock: 16, status: 'active' },
  { name: 'Mechanical Keyboard', sku: 'ACC-001', category: 'Accessories', price: 119, stock: 3, status: 'active' },
  { name: 'Ergonomic Mouse', sku: 'ACC-002', category: 'Accessories', price: 79, stock: 27, status: 'active' },
  { name: 'USB-C Hub', sku: 'ACC-003', category: 'Accessories', price: 59, stock: 4, status: 'active' },
  { name: 'Laptop Stand', sku: 'ACC-004', category: 'Accessories', price: 49, stock: 45, status: 'draft' },
  { name: 'Webcam Pro', sku: 'CAM-001', category: 'Computing', price: 169, stock: 0, status: 'archived' },
];

function mulberry32(seed) {
  let value = seed;

  return function random() {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)];
}

function randomInt(random, minimum, maximum) {
  return Math.floor(random() * (maximum - minimum + 1)) + minimum;
}

function statusFor(random) {
  const draw = random();

  if (draw < 0.46) {
    return 'completed';
  }

  if (draw < 0.62) {
    return 'paid';
  }

  if (draw < 0.74) {
    return 'shipped';
  }

  if (draw < 0.92) {
    return 'pending';
  }

  return 'cancelled';
}

function buildOrders(customerDocuments, productDocuments) {
  const random = mulberry32(42);
  const orders = [];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  for (let index = 0; index < 60; index += 1) {
    const customer = pick(random, customerDocuments);
    const chosenProducts = [];
    const itemCount = randomInt(random, 1, 3);

    while (chosenProducts.length < itemCount) {
      const product = pick(random, productDocuments);

      if (!chosenProducts.some((item) => item.sku === product.sku)) {
        chosenProducts.push(product);
      }
    }

    const items = chosenProducts.map((product) => {
      const quantity = randomInt(random, 1, 3);
      const unitPrice = roundMoney(product.price);

      return {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        lineTotal: roundMoney(unitPrice * quantity),
      };
    });

    const createdAt = new Date(now - Math.floor(random() * 360 * day));
    const totalAmount = roundMoney(items.reduce((total, item) => total + item.lineTotal, 0));

    orders.push({
      orderNumber: generateOrderNumber(createdAt),
      customerId: customer._id,
      customerName: customer.name,
      items,
      totalAmount,
      status: statusFor(random),
      createdAt,
      updatedAt: createdAt,
    });
  }

  return orders;
}

async function seed() {
  const reset = process.argv.includes('--reset');
  await connectDB();
  await Promise.all([Customer.init(), Product.init(), Order.init()]);

  const existingCustomers = await Customer.countDocuments();

  if (existingCustomers > 0 && !reset) {
    console.log('Database already contains data. Re-run with --reset to replace it.');
    return;
  }

  if (reset) {
    await Promise.all([Order.deleteMany({}), Product.deleteMany({}), Customer.deleteMany({})]);
  }

  const customerDocuments = await Customer.insertMany(customers);
  const productDocuments = await Product.insertMany(products);
  const orderDocuments = buildOrders(customerDocuments, productDocuments);

  await Order.insertMany(orderDocuments, { timestamps: false });

  console.log(
    `Seeded ${customerDocuments.length} customers, ${productDocuments.length} products, and ${orderDocuments.length} orders.`,
  );
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
  });
