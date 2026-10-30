import { ArrowUpDown } from 'lucide-react';
import { cx } from '../utils/format.js';

// Clickable column header, Cedro style. `sort` is the API's "field:asc|desc".
export default function SortHeader({ field, label, sort, onSort, className }) {
  const [activeField, dir] = sort.split(':');
  const active = activeField === field;
  const nextDir = active && dir === 'asc' ? 'desc' : 'asc';

  return (
    <th
      className={cx('px-3 py-2.5 font-medium', className)}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(`${field}:${nextDir}`)}
        className="inline-flex items-center gap-1.5 hover:text-foreground"
      >
        {label}
        <ArrowUpDown className={cx('size-3', active && 'text-foreground')} aria-hidden="true" />
      </button>
    </th>
  );
}
