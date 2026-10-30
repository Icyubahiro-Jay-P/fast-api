import { ApiError } from '../utils/ApiError.js';
import { isValidObjectId } from '../utils/objectId.js';

export function validateObjectIdParam(req, _res, next) {
  if (!isValidObjectId(req.params.id)) {
    next(new ApiError(400, 'invalid_id', 'id must be a valid MongoDB ObjectId.', { field: 'id' }));
    return;
  }

  next();
}
