import { Order, Product } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { PRODUCT_SORT_FIELDS } from '../utils/constants.js';
import { skipFor } from '../utils/pagination.js';
import { escapeRegex, searchRegex } from '../utils/search.js';
import { parseSort } from '../utils/sort.js';

function buildFilter({ search, category, status, minPrice, maxPrice }) {
  const filter = {};

  if (search) {
    const regex = searchRegex(search);
    filter.$or = [{ name: regex }, { sku: regex }, { category: regex }];
  }

  if (category) {
    filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
  }

  if (status) {
    filter.status = status;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};

    if (minPrice !== undefined) {
      filter.price.$gte = minPrice;
    }

    if (maxPrice !== undefined) {
      filter.price.$lte = maxPrice;
    }
  }

  return filter;
}

export async function listProducts(query) {
  const { search, category, status, minPrice, maxPrice, sort, page, pageSize } = query;
  const filter = buildFilter({ search, category, status, minPrice, maxPrice });
  const sortSpec = parseSort(sort, PRODUCT_SORT_FIELDS);

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(sortSpec)
      .skip(skipFor(page, pageSize))
      .limit(pageSize),
    Product.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getProduct(id) {
  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, 'product_not_found', 'Product not found.');
  }

  return product;
}

export async function createProduct(data) {
  return Product.create(data);
}

export async function updateProduct(id, data) {
  const product = await Product.findByIdAndUpdate(id, data, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (!product) {
    throw new ApiError(404, 'product_not_found', 'Product not found.');
  }

  return product;
}

export async function deleteProduct(id) {
  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, 'product_not_found', 'Product not found.');
  }

  const referenced = await Order.exists({ 'items.productId': id });

  if (referenced) {
    throw new ApiError(
      409,
      'product_in_use',
      'Product cannot be deleted because orders reference it.',
      { productId: id },
    );
  }

  await product.deleteOne();
}
