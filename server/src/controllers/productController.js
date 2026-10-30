import * as productService from '../services/productService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendPage } from '../utils/respond.js';

export const listProducts = asyncHandler(async (req, res) => {
  const { page, pageSize } = req.validatedQuery;
  const result = await productService.listProducts(req.validatedQuery);
  sendPage(res, result, page, pageSize);
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.params.id);
  res.json(product);
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json(product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.params.id);
  res.status(204).send();
});
