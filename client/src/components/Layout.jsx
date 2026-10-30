import { Database, LayoutGrid, Menu, Package, PanelLeft, ShoppingBag, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { cx } from '../utils/format.js';
import ThemeToggle from './ThemeToggle.jsx';

const navigation = [
  { to: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/orders', label: 'Orders', icon: ShoppingBag },
];

const sectionLabels = Object.fromEntries(navigation.map((item) => [item.to, item.label]));

function Sidebar({ open, onClose }) {
  return (
    <>
      {open ? <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-hidden="true" /> : null}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto border-r bg-sidebar p-3 text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-2 px-1 py-1">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-foreground text-sm font-bold text-background">
              C
            </span>
            <span className="text-lg font-semibold tracking-tight">CEDO</span>
          </Link>
          <button className="icon-button ml-auto lg:hidden" type="button" aria-label="Close sidebar" onClick={onClose}>
            <PanelLeft className="size-4" />
          </button>
        </div>

        <nav aria-label="Workspace" className="mt-6">
          <p className="mb-1.5 px-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Main Navigation
          </p>
          <div className="space-y-0.5">
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cx(
                    'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors hover:bg-foreground/5 hover:text-foreground',
                    isActive ? 'border bg-card font-medium text-foreground shadow-xs' : 'text-muted-foreground',
                  )
                }
              >
                <Icon className="size-4" /> {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="mt-auto pt-6">
          <div className="flex items-center gap-2.5 rounded-xl border bg-card p-2 shadow-xs">
            <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-slate-300 to-slate-500 text-white dark:from-slate-500 dark:to-slate-700">
              <Database className="size-4" />
              <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-card bg-emerald-500" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">CEDO workspace</span>
              <span className="block truncate text-xs text-muted-foreground">Connected to live data</span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar({ section, onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-xl">
      <button className="icon-button lg:hidden" type="button" aria-label="Open sidebar" onClick={onMenuClick}>
        <Menu className="size-4" />
      </button>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <LayoutGrid className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground">CEDO</span>
        <span className="text-muted-foreground/60">/</span>
        <span className="font-medium">{section}</span>
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}

export default function Layout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const section = sectionLabels[location.pathname] ?? 'Not found';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors lg:flex">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="min-w-0 flex-1">
        <Topbar section={section} onMenuClick={() => setMenuOpen(true)} />
        <main className="space-y-4 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
