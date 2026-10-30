import Icon from './Icon.jsx';

export default function EmptyState({ icon = 'spark', title, message, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-xl border bg-card shadow-xs">
        <Icon name={icon} size={18} className="text-muted-foreground" />
      </span>
      <h3 className="mt-3 text-sm font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
