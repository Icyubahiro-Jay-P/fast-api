import Icon from './Icon.jsx';

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs"
      role="alert"
    >
      <Icon name="alert" size={16} className="shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <strong className="font-medium">Something went wrong</strong>
        <p className="text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <button className="btn btn--small btn--ghost" type="button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
