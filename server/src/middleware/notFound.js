import { ApiError } from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, 'route_not_found', `No route matches ${req.method} ${req.originalUrl}.`));
}
