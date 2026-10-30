import * as dashboardService from '../services/dashboardService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSummary = asyncHandler(async (_req, res) => {
  res.json(await dashboardService.summary());
});

export const getOrdersByStatus = asyncHandler(async (_req, res) => {
  res.json(await dashboardService.ordersByStatus());
});

export const getProductsByCategory = asyncHandler(async (_req, res) => {
  res.json(await dashboardService.productsByCategory());
});

export const getMonthlyRevenue = asyncHandler(async (req, res) => {
  res.json(await dashboardService.monthlyRevenue(req.validatedQuery.months));
});

export const getTopProducts = asyncHandler(async (req, res) => {
  res.json(await dashboardService.topProducts(req.validatedQuery.limit));
});

export const getRecentOrders = asyncHandler(async (req, res) => {
  res.json(await dashboardService.recentOrders(req.validatedQuery.limit));
});
