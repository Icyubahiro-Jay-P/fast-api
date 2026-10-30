import {
  ArrowUpDown,
  ChartColumn,
  DollarSign,
  FileChartColumn,
  Layers,
  Package,
  Receipt,
  ShoppingBag,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import ErrorBanner from '../components/ErrorBanner.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Panel from '../components/Panel.jsx';
import RevenueChart, { RangeSelect } from '../components/RevenueChart.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import StatusIcon from '../components/StatusIcon.jsx';
import {
  cx,
  formatCurrency,
  formatDate,
  formatNumber,
  pluralize,
  titleCase,
} from '../utils/format.js';

const OPEN_STATUSES = ['pending', 'paid', 'shipped'];
const ACTIVITY_TABS = {
  All: () => true,
  Open: (order) => OPEN_STATUSES.includes(order.status),
  Closed: (order) => !OPEN_STATUSES.includes(order.status),
};

// Change between the last two complete months (the current month is still partial).
function monthDelta(series) {
  const [previous, last] = series.slice(-3, -1);
  if (series.length < 3 || !previous) {
    return null;
  }
  return Math.round(((last - previous) / previous) * 1000) / 10;
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="h-28 animate-pulse rounded-2xl border bg-muted/60" key={index} />
        ))}
      </div>
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="h-96 flex-1 animate-pulse rounded-2xl border bg-muted/60" />
        <div className="h-96 animate-pulse rounded-2xl border bg-muted/60 xl:w-85" />
      </div>
    </div>
  );
}

function LatestOrders({ orders, className }) {
  const [tab, setTab] = useState('All');
  const [query, setQuery] = useState('');
  const inTab = orders.filter(ACTIVITY_TABS[tab]);
  const q = query.trim().toLowerCase();
  const items = inTab.filter((order) => `${order.orderNumber} ${order.customerName}`.toLowerCase().includes(q));

  return (
    <Panel title="Latest Orders" icon={FileChartColumn} className={className} bodyClassName="flex flex-col p-3">
      <div role="tablist" className="grid grid-cols-3 gap-2">
        {Object.keys(ACTIVITY_TABS).map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={cx(
              'h-8 rounded-lg border text-xs font-medium transition-colors',
              tab === name ? 'border-transparent bg-foreground text-background' : 'hover:bg-foreground/5',
            )}
          >
            {name}
          </button>
        ))}
      </div>
      <label className="relative mt-3 block">
        <span className="sr-only">Search orders</span>
        <Icon
          name="search"
          size={14}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search order or customer"
          className="control bg-transparent pl-8 shadow-none"
        />
      </label>
      <p className="mt-3 border-b border-dashed pb-3 text-xs text-muted-foreground">
        <span className="text-base font-semibold text-foreground">{inTab.length}</span>{' '}
        {tab === 'All' ? 'recent' : tab.toLowerCase()} {inTab.length === 1 ? 'order' : 'orders'}
      </p>
      <ol className="relative mt-3 flex-1 space-y-4 overflow-y-auto xl:max-h-110">
        {items.map((order, index) => (
            <li key={order.id} className="relative flex gap-3">
              {index < items.length - 1 ? (
                <span className="absolute top-8 -bottom-4 left-3.75 border-l border-dashed" aria-hidden="true" />
              ) : null}
              <span className="grid size-8 shrink-0 place-items-center rounded-lg border bg-card shadow-xs">
                <StatusIcon status={order.status} className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2 text-xs font-medium">
                  <span className="truncate font-mono">{order.orderNumber}</span>
                  <span className="shrink-0 font-normal text-muted-foreground">{formatDate(order.createdAt)}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  <b className="font-medium text-foreground">{order.customerName}</b> -{' '}
                  {formatCurrency(order.totalAmount)} - {titleCase(order.status)}
                </p>
              </div>
            </li>
        ))}
        {!items.length ? (
          <li className="py-6 text-center text-xs text-muted-foreground">
            {orders.length ? 'No matching orders.' : 'No orders yet.'}
          </li>
        ) : null}
      </ol>
      <Link to="/orders" className="btn btn--ghost mt-3 w-full">
        All orders
        <Icon name="arrowRight" size={14} />
      </Link>
    </Panel>
  );
}

const PRODUCT_COLUMNS = [
  { key: 'rank', label: '#' },
  { key: 'productName', label: 'Product' },
  { key: 'sku', label: 'SKU' },
  { key: 'unitsSold', label: 'Units Sold' },
  { key: 'revenue', label: 'Revenue' },
];

function TopProducts({ products }) {
  const [sort, setSort] = useState({ key: 'rank', dir: 1 });
  const rows = useMemo(() => {
    const ranked = products.map((product, index) => ({ ...product, rank: index + 1 }));
    return ranked.sort((a, b) =>
      a[sort.key] > b[sort.key] ? sort.dir : a[sort.key] < b[sort.key] ? -sort.dir : 0,
    );
  }, [products, sort]);

  return (
    <Panel title="Top Products" icon={Trophy} bodyClassName="overflow-x-auto">
      <table className="w-full min-w-120 text-left text-xs">
        <thead className="text-muted-foreground">
          <tr className="border-b bg-muted/50">
            {PRODUCT_COLUMNS.map((column) => (
              <th
                key={column.key}
                className="px-3 py-2.5 font-medium"
                aria-sort={sort.key === column.key ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSort((current) => ({ key: column.key, dir: current.key === column.key ? -current.dir : 1 }))
                  }
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  {column.label}
                  <ArrowUpDown className={cx('size-3', sort.key === column.key && 'text-foreground')} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((product) => (
            <tr key={product.productId} className="border-b last:border-0 hover:bg-muted/40">
              <td className="px-3 py-3 font-medium tabular-nums">{String(product.rank).padStart(2, '0')}</td>
              <td className="px-3 py-3 font-medium">{product.productName}</td>
              <td className="px-3 py-3 font-mono text-muted-foreground">{product.sku}</td>
              <td className="px-3 py-3 tabular-nums">{formatNumber(product.unitsSold)}</td>
              <td className="px-3 py-3 font-medium tabular-nums">{formatCurrency(product.revenue)}</td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={PRODUCT_COLUMNS.length} className="py-8 text-center text-muted-foreground">
                No revenue product activity yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Panel>
  );
}

function OrdersByStatus({ rows }) {
  const max = Math.max(...rows.map((row) => row.orders), 1);
  return (
    <Panel title="Orders by Status" icon={ChartColumn} bodyClassName="space-y-3.5 p-4">
      {rows.map((row) => (
        <div key={row.status}>
          <div className="flex items-center gap-2 text-xs">
            <StatusBadge status={row.status} />
            <span className="text-muted-foreground">{pluralize(row.orders, 'order')}</span>
            <span className="ml-auto font-medium tabular-nums">{formatCurrency(row.revenue)}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-linear-to-r from-slate-600 to-slate-900 dark:from-slate-200 dark:to-slate-400"
              style={{ width: `${row.orders === 0 ? 0 : Math.max(4, (row.orders / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </Panel>
  );
}

function ProductsByCategory({ rows }) {
  return (
    <Panel
      title="Products by Category"
      action={
        <Link to="/products" className="text-xs font-medium hover:text-foreground">
          View catalog
        </Link>
      }
      icon={Layers}
      bodyClassName="overflow-x-auto"
    >
      <table className="w-full min-w-96 text-left text-xs">
        <thead className="text-muted-foreground">
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2.5 font-medium">Category</th>
            <th className="px-3 py-2.5 font-medium">Products</th>
            <th className="px-3 py-2.5 font-medium">In Stock</th>
            <th className="px-3 py-2.5 font-medium">Avg. Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category} className="border-b last:border-0 hover:bg-muted/40">
              <td className="px-3 py-3 font-medium">{titleCase(row.category)}</td>
              <td className="px-3 py-3 tabular-nums">{formatNumber(row.products)}</td>
              <td className="px-3 py-3 tabular-nums">{formatNumber(row.totalStock)}</td>
              <td className="px-3 py-3 tabular-nums">{formatCurrency(row.averagePrice)}</td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-muted-foreground">
                No products in the catalog yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Panel>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [range, setRange] = useState('Last 12 months');
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setRefreshing(hasLoadedRef.current);
    setError('');

    async function loadDashboard() {
      try {
        const [summary, monthlyRevenue, ordersByStatus, productsByCategory, topProducts, recentOrders] =
          await Promise.all([
            api.dashboard.summary(controller.signal),
            api.dashboard.monthlyRevenue(12, controller.signal),
            api.dashboard.ordersByStatus(controller.signal),
            api.dashboard.productsByCategory(controller.signal),
            api.dashboard.topProducts(5, controller.signal),
            api.dashboard.recentOrders(10, controller.signal),
          ]);

        setData({ summary, monthlyRevenue, ordersByStatus, productsByCategory, topProducts, recentOrders });
        hasLoadedRef.current = true;
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  const header = (
    <PageHeader
      title="Welcome back 👋"
      description="Here are the latest insights from your revenue, orders, and catalog."
      actions={
        <>
          <RangeSelect value={range} onChange={setRange} />
          <button className="btn btn--ghost" type="button" onClick={refresh} disabled={loading}>
            <Icon name="refresh" size={14} className={refreshing ? 'animate-spin' : undefined} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link className="btn btn--primary" to="/orders?new=1">
            <Icon name="plus" size={14} />
            New order
          </Link>
        </>
      }
    />
  );

  if (!data) {
    return (
      <>
        {header}
        {loading ? <Skeleton /> : <ErrorBanner message={error} onRetry={refresh} />}
      </>
    );
  }

  const { summary, monthlyRevenue, ordersByStatus, productsByCategory, topProducts, recentOrders } = data;
  const revenueSeries = monthlyRevenue.map((row) => row.revenue);
  const aovSeries = monthlyRevenue.map((row) => (row.orders ? row.revenue / row.orders : 0));

  return (
    <>
      {header}

      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4" aria-label="Key business metrics">
            <StatCard
              label="Total Revenue"
              icon={DollarSign}
              value={formatCurrency(summary.totalRevenue)}
              delta={monthDelta(revenueSeries)}
              detail={`${pluralize(summary.revenueOrders, 'revenue order')}`}
              trend={revenueSeries}
            />
            <StatCard
              label="Total Orders"
              icon={ShoppingBag}
              value={formatNumber(summary.totalOrders)}
              detail={`${formatNumber(summary.pendingOrders)} awaiting fulfilment`}
            />
            <StatCard
              label="Customers"
              icon={Users}
              value={formatNumber(summary.customers)}
              detail={`${formatNumber(summary.completedOrders)} completed orders`}
            />
            <StatCard
              label="Avg. Order Value"
              icon={Receipt}
              value={formatCurrency(summary.averageOrderValue)}
              delta={monthDelta(aovSeries)}
              detail={`Across ${pluralize(summary.revenueOrders, 'revenue order')}`}
              trend={aovSeries}
            />
          </section>

          {summary.lowStockProducts > 0 ? (
            <Link
              to="/products"
              className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs transition-colors hover:bg-amber-500/10"
            >
              <Package className="size-4 shrink-0 text-amber-500" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <b className="font-medium">{pluralize(summary.lowStockProducts, 'product')} running low.</b>{' '}
                <span className="text-muted-foreground">Active products at or below five units need attention.</span>
              </span>
              <span className="inline-flex items-center gap-1 font-medium">
                Review <Icon name="arrowRight" size={14} />
              </span>
            </Link>
          ) : null}

          <RevenueChart data={monthlyRevenue} range={range} onRangeChange={setRange} />
        </div>
        <LatestOrders orders={recentOrders} className="xl:w-85 xl:shrink-0" />
      </div>

      <TopProducts products={topProducts} />

      <div className="grid gap-4 lg:grid-cols-2">
        <OrdersByStatus rows={ordersByStatus} />
        <ProductsByCategory rows={productsByCategory} />
      </div>
    </>
  );
}
