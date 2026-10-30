import * as orderService from '../services/orderService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendPage } from '../utils/respond.js';

export const listOrders = asyncHandler(async (req, res) => {
  const { page, pageSize } = req.validatedQuery;
  const result = await orderService.listOrders(req.validatedQuery);
  sendPage(res, result, page, pageSize);
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.id);
  res.json(order);
});

export const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body);
  res.status(201).json(order);
});

export const updateOrder = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrder(req.params.id, req.body);
  res.json(order);
});

export const deleteOrder = asyncHandler(async (req, res) => {
  await orderService.deleteOrder(req.params.id);
  res.status(204).send();
});
