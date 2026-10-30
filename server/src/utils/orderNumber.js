import { randomBytes } from 'node:crypto';

export function generateOrderNumber(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `ORD-${stamp}-${suffix}`;
}
