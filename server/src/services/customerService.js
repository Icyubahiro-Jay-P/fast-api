import { Customer, Order } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { CUSTOMER_SORT_FIELDS } from '../utils/constants.js';
import { skipFor } from '../utils/pagination.js';
import { searchRegex } from '../utils/search.js';
import { parseSort } from '../utils/sort.js';

function buildFilter({ search, status }) {
  const filter = {};

  if (search) {
    const regex = searchRegex(search);
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  if (status) {
    filter.status = status;
  }

  return filter;
}

export async function listCustomers(query) {
  const { search, status, sort, page, pageSize } = query;
  const filter = buildFilter({ search, status });
  const sortSpec = parseSort(sort, CUSTOMER_SORT_FIELDS);

  const [items, total] = await Promise.all([
    Customer.find(filter)
      .sort(sortSpec)
      .skip(skipFor(page, pageSize))
      .limit(pageSize),
    Customer.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getCustomer(id) {
  const customer = await Customer.findById(id);

  if (!customer) {
    throw new ApiError(404, 'customer_not_found', 'Customer not found.');
  }

  return customer;
}

export async function createCustomer(data) {
  return Customer.create(data);
}

export async function updateCustomer(id, data) {
  const customer = await Customer.findByIdAndUpdate(id, data, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (!customer) {
    throw new ApiError(404, 'customer_not_found', 'Customer not found.');
  }

  return customer;
}

export async function deleteCustomer(id) {
  const customer = await Customer.findById(id);

  if (!customer) {
    throw new ApiError(404, 'customer_not_found', 'Customer not found.');
  }

  const referenced = await Order.exists({ customerId: id });

  if (referenced) {
    throw new ApiError(
      409,
      'customer_in_use',
      'Customer cannot be deleted because orders reference them.',
      { customerId: id },
    );
  }

  await customer.deleteOne();
}
