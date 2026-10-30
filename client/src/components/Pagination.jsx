import { formatNumber } from '../utils/format.js';
import Icon from './Icon.jsx';

export default function Pagination({ page, pages, total, pageSize, onPageChange, label = 'items' }) {
  if (total === 0) {
    return null;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2.5 text-xs text-muted-foreground"
      aria-label={`${label} pagination`}
    >
      <p>
        <span className="font-medium text-foreground">
          {formatNumber(from)}-{formatNumber(to)}
        </span>{' '}
        of {formatNumber(total)} {label}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="icon-button icon-button--bordered size-7"
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <Icon name="chevronLeft" size={14} />
        </button>
        <span>
          Page <span className="font-medium text-foreground">{page}</span> of {Math.max(pages, 1)}
        </span>
        <button
          className="icon-button icon-button--bordered size-7"
          type="button"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          <Icon name="chevronRight" size={14} />
        </button>
      </div>
    </nav>
  );
}
