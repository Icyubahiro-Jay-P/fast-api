import { cx } from '../utils/format.js';

// Subtle diagonal hatch used on panel headers, tinted from the theme foreground.
const hatch = {
  backgroundImage:
    'repeating-linear-gradient(135deg, color-mix(in oklch, var(--foreground) 5%, transparent) 0 1px, transparent 1px 7px)',
};

// The Cedro panel: muted frame, hatched header, card body.
export default function Panel({ title, icon: Icon, action, className, bodyClassName, children, ...props }) {
  return (
    <section
      className={cx('flex min-w-0 flex-col rounded-2xl border bg-muted/60 p-1.5 dark:bg-muted/30', className)}
      {...props}
    >
      <header style={hatch} className="flex min-h-10 flex-wrap items-center gap-2 rounded-t-xl px-2.5 py-1.5">
        <h2 className="text-sm font-medium">{title}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-muted-foreground">
          {action}
          {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
        </div>
      </header>
      <div className={cx('flex-1 rounded-xl border bg-card shadow-xs', bodyClassName)}>{children}</div>
    </section>
  );
}
