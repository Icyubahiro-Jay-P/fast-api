import { Archive, Check, CircleMinus, CircleX, Clock, CreditCard, FileText, Truck } from 'lucide-react';
import { cx } from '../utils/format.js';

// Icon + tone per status, as in the Cedro ticket status column.
const STATUS = {
  pending: { icon: Clock, tone: 'text-amber-500' },
  paid: { icon: CreditCard, tone: 'text-blue-500' },
  shipped: { icon: Truck, tone: 'text-violet-500' },
  completed: { icon: Check, tone: 'text-emerald-500' },
  cancelled: { icon: CircleX, tone: 'text-red-500' },
  active: { icon: Check, tone: 'text-emerald-500' },
  inactive: { icon: CircleMinus, tone: 'text-muted-foreground' },
  draft: { icon: FileText, tone: 'text-amber-500' },
  archived: { icon: Archive, tone: 'text-muted-foreground' },
};

export default function StatusIcon({ status, className }) {
  const { icon: Icon, tone } = STATUS[status] ?? { icon: Clock, tone: 'text-muted-foreground' };
  return <Icon className={cx('size-3.5', tone, className)} aria-hidden="true" />;
}
