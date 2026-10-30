import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

function duplicateDetails(error) {
  const field = Object.keys(error.keyValue ?? {})[0];
  const value = field ? error.keyValue[field] : undefined;

  return field ? { field, value } : null;
}

function validationDetails(error) {
  return Object.entries(error.errors).map(([field, issue]) => ({
    path: field,
    message: issue.message,
  }));
}

export function errorHandler(error, _req, res, _next) {
  let status = 500;
  let code = 'internal_error';
  let message = 'An unexpected error occurred.';
  let details = null;

  if (error instanceof ApiError) {
    status = error.status;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof SyntaxError && 'body' in error) {
    status = 400;
    code = 'invalid_json';
    message = 'The request body contains invalid JSON.';
  } else if (error instanceof mongoose.Error.ValidationError) {
    status = 422;
    code = 'validation_error';
    message = 'Document validation failed.';
    details = validationDetails(error);
  } else if (error instanceof mongoose.Error.CastError) {
    status = 400;
    code = 'invalid_id';
    message = 'A supplied identifier or value has the wrong format.';
    details = { path: error.path, value: error.value };
  } else if (error.code === 11000) {
    status = 409;
    code = 'duplicate_value';
    message = 'A record with that unique value already exists.';
    details = duplicateDetails(error);
  }

  if (status >= 500 && !env.isTest) {
    console.error(error);
  }

  res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}
