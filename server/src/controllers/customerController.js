import * as customerService from '../services/customerService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendPage } from '../utils/respond.js';

export const listCustomers = asyncHandler(async (req, res) => {
  const { page, pageSize } = req.validatedQuery;
  const result = await customerService.listCustomers(req.validatedQuery);
  sendPage(res, result, page, pageSize);
});

export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomer(req.params.id);
  res.json(customer);
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body);
  res.status(201).json(customer);
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  res.json(customer);
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(req.params.id);
  res.status(204).send();
});
