import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

function formatIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

export function validate({ body, query, params } = {}) {
  return function validationMiddleware(req, _res, next) {
    try {
      if (body) {
        req.body = body.parse(req.body);
      }

      if (query) {
        req.validatedQuery = query.parse(req.query);
      }

      if (params) {
        req.params = params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ApiError(
            422,
            'validation_error',
            'Request validation failed.',
            formatIssues(error),
          ),
        );
        return;
      }

      next(error);
    }
  };
}
