import { Customer, Order, Product } from '../src/models/index.js';
import { roundMoney } from '../src/utils/numbers.js';
import { generateOrderNumber } from '../src/utils/orderNumber.js';

let sequence = 0;

function nextSequence() {
  sequence += 1;
  return sequence;
}

export async function makeCustomer(overrides = {}) {
  const index = nextSequence();

  return Customer.create({
    name: `Customer ${index}`,
    email: `customer${index}@example.com`,
    phone: '+1 555 0100',
    status: 'active',
    ...overrides,
  });
}

export async function makeProduct(overrides = {}) {
  const index = nextSequence();

  return Product.create({
    name: `Product ${index}`,
    sku: `TST-${String(index).padStart(3, '0')}`,
    category: 'Testing',
    price: 25,
    stock: 10,
    status: 'active',
    ...overrides,
  });
}

export async function makeOrder({
  customer,
  items,
  status = 'paid',
  createdAt = new Date(),
  orderNumber = generateOrderNumber(createdAt),
}) {
  const orderItems = items.map(({ product, quantity }) => {
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
  const totalAmount = roundMoney(orderItems.reduce((total, item) => total + item.lineTotal, 0));
  const [order] = await Order.insertMany(
    [
      {
        orderNumber,
        customerId: customer._id,
        customerName: customer.name,
        items: orderItems,
        totalAmount,
        status,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    { timestamps: false },
  );

  return order;
}
