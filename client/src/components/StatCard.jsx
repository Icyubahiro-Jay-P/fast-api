import { cx } from '../utils/format.js';
import Panel from './Panel.jsx';
import Sparkline from './Sparkline.jsx';

function Delta({ value }) {
  return (
    <span className={cx('font-medium', value < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400')}>
      {value > 0 ? '+' : ''}
      {value}%
    </span>
  );
}

// Cedro KPI card. `delta` is the last full month's % change, `trend` feeds the sparkline.
export default function StatCard({ label, icon, value, detail, delta, trend = [] }) {
  return (
    <Panel title={label} icon={icon} className="min-w-0 flex-1" bodyClassName="flex items-end justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="truncate text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {delta !== undefined && delta !== null ? (
            <>
              <Delta value={delta} /> last full month
            </>
          ) : (
            detail
          )}
        </p>
      </div>
      <Sparkline data={trend} negative={delta < 0} />
    </Panel>
  );
}
