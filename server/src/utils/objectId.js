import { ApiError } from './ApiError.js';

export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export function isValidObjectId(value) {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}

export function assertObjectId(value, field = 'id') {
  if (!isValidObjectId(value)) {
    throw new ApiError(400, 'invalid_id', `${field} must be a valid MongoDB ObjectId.`, {
      field,
    });
  }

  return value;
}
