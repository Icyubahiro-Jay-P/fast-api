export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function searchRegex(value) {
  return new RegExp(escapeRegex(value.trim()), 'i');
}
