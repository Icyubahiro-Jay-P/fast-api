import { CalendarDays, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  cx,
  formatCompactCurrency,
  formatCurrency,
  formatMonth,
  formatNumber,
} from '../utils/format.js';
import Panel from './Panel.jsx';

const RANGES = { 'Last 6 months': 6, 'Last 12 months': 12 };

function niceMaximum(value) {
  if (value <= 0) {
    return 100;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function RangeSelect({ value, onChange }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Date range</span>
      <CalendarDays className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 appearance-none rounded-lg border bg-card pr-7 pl-8 text-xs font-medium text-foreground shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {Object.keys(RANGES).map((range) => (
          <option key={range}>{range}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" />
    </label>
  );
}

// Cedro "volume trend" bar chart, fed by /dashboard/monthly-revenue rows.
export default function RevenueChart({ data, range, onRangeChange }) {
  const rows = (Array.isArray(data) ? data : []).slice(-RANGES[range]);
  const lastIndex = Math.max(rows.length - 1, 0);
  const [hovered, setHovered] = useState(null);
  const active = hovered !== null && hovered < rows.length ? hovered : lastIndex;
  const maximum = niceMaximum(Math.max(...rows.map((row) => row.revenue), 0));
  const axis = [1, 0.75, 0.5, 0.25, 0].map((tick) => maximum * tick);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalOrders = rows.reduce((sum, row) => sum + row.orders, 0);
  const current = rows[active];

  return (
    <Panel
      title="Revenue Trend"
      action={<RangeSelect value={range} onChange={onRangeChange} />}
      bodyClassName="p-4"
    >
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{formatCurrency(totalRevenue)}</span>
        <span className="text-xs text-muted-foreground">
          from {formatNumber(totalOrders)} revenue {totalOrders === 1 ? 'order' : 'orders'}
        </span>
      </p>

      <div className="mt-6 flex gap-3">
        <div className="relative h-56 flex-1">
          {current && current.revenue > 0 ? (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-foreground/40 transition-all"
              style={{ bottom: `${(current.revenue / maximum) * 100}%` }}
            >
              <span
                className="absolute -translate-y-[calc(100%+4px)] rounded-md bg-foreground px-2 py-1 text-[11px] font-medium whitespace-nowrap text-background"
                style={
                  active > rows.length / 2
                    ? { right: `calc(${((rows.length - active) / rows.length) * 100}% + 6px)` }
                    : { left: `calc(${((active + 1) / rows.length) * 100}% + 6px)` }
                }
              >
                {formatMonth(current.month)} : {formatCurrency(current.revenue)}
              </span>
            </div>
          ) : null}
          <div className="flex h-full items-end gap-1.5 sm:gap-2.5" onMouseLeave={() => setHovered(null)}>
            {rows.map((row, index) => (
              <button
                key={row.month}
                type="button"
                aria-label={`${formatMonth(row.month)}: ${formatCurrency(row.revenue)} from ${row.orders} orders`}
                onMouseEnter={() => setHovered(index)}
                onFocus={() => setHovered(index)}
                onClick={() => setHovered(index)}
                style={{ height: `${Math.max((row.revenue / maximum) * 100, 1)}%` }}
                className={cx(
                  'flex-1 rounded-t-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  index === active
                    ? 'bg-linear-to-b from-slate-600 to-slate-900 dark:from-slate-200 dark:to-slate-400'
                    : 'bg-linear-to-b from-foreground/10 to-foreground/3',
                )}
              />
            ))}
          </div>
        </div>
        <div className="flex h-56 w-12 flex-col justify-between text-right text-xs text-muted-foreground tabular-nums">
          {axis.map((value) => (
            <span key={value} className="leading-none">
              {formatCompactCurrency(value)}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-1.5 pr-15 text-xs text-muted-foreground sm:gap-2.5">
        {rows.map((row, index) => (
          <span
            key={row.month}
            className={cx('flex-1 truncate text-center', rows.length > 6 && index % 2 === 1 && 'invisible sm:visible')}
          >
            {formatMonth(row.month).split(' ')[0]}
          </span>
        ))}
      </div>
    </Panel>
  );
}
