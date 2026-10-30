import { ApiError } from './ApiError.js';

export function parseSort(sort, allowedFields, fallback = { createdAt: -1 }) {
  if (!sort) {
    return fallback;
  }

  const spec = {};

  for (const segment of sort.split(',')) {
    const [rawField, rawDirection = 'desc'] = segment.split(':');
    const field = rawField.trim();
    const direction = rawDirection.trim().toLowerCase();

    if (!allowedFields.includes(field)) {
      throw new ApiError(
        422,
        'invalid_sort',
        `Cannot sort by "${field}".`,
        { allowedFields },
      );
    }

    if (!['asc', 'desc'].includes(direction)) {
      throw new ApiError(422, 'invalid_sort', 'Sort direction must be asc or desc.', {
        field,
        direction,
      });
    }

    spec[field] = direction === 'asc' ? 1 : -1;
  }

  return Object.keys(spec).length > 0 ? spec : fallback;
}
