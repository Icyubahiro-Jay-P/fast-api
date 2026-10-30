import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

export default function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="text-6xl font-semibold tracking-tight text-muted-foreground/40 tabular-nums">404</span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">This page is not part of the workspace.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The link may be outdated, or the page may have moved. Head back to the overview to pick up where you
        left off.
      </p>
      <Link className="btn btn--primary mt-6" to="/dashboard">
        Back to dashboard
        <Icon name="arrowRight" size={14} />
      </Link>
    </section>
  );
}
