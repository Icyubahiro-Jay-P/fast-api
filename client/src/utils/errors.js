export function parseApiError(error) {
  const fieldErrors = {};
  const messages = [];
  const details = error?.details;

  if (Array.isArray(details)) {
    details.forEach((detail) => {
      if (typeof detail?.path === 'string' && detail.path && !fieldErrors[detail.path]) {
        fieldErrors[detail.path] = detail.message;
      }

      if (!detail?.path && detail?.message) {
        messages.push(detail.message);
      }
    });
  }

  if (messages.length === 0 && Object.keys(fieldErrors).length === 0) {
    messages.push(error?.message ?? 'The request could not be completed.');
  }

  return { fieldErrors, messages };
}

export function errorFor(fieldErrors, path) {
  return fieldErrors?.[path];
}
