import { ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import Icon from '../components/Icon.jsx';
import OrderForm from '../components/OrderForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Panel from '../components/Panel.jsx';
import Pagination from '../components/Pagination.jsx';
import SearchInput from '../components/SearchInput.jsx';
import SortHeader from '../components/SortHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TableSkeleton from '../components/TableSkeleton.jsx';
import { useToast } from '../context/toast.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { ORDER_STATUSES } from '../utils/constants.js';
import { formatCurrency, formatDate, initials, pluralize, titleCase } from '../utils/format.js';

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const { notify } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formState, setFormState] = useState(() =>
    searchParams.get('new') === '1' ? { order: null } : null,
  );
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    if (searchParams.get('new') !== '1') {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError('');

    api.orders
      .list(
        {
          search: debouncedSearch,
          status,
          sort,
          page,
          pageSize: PAGE_SIZE,
        },
        controller.signal,
      )
      .then((response) => {
        setData(response);
      })
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedSearch, status, sort, page, refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);
  const changeSort = (value) => {
    setSort(value);
    setPage(1);
  };
  const hasFilters = Boolean(search || status);
  const items = data?.items ?? [];
  const showEmpty = !loading && !error && items.length === 0;

  function clearFilters() {
    setSearch('');
    setStatus('');
    setSort('createdAt:desc');
    setPage(1);
  }

  function handleSaved(order, editing) {
    setFormState(null);
    notify(
      editing
        ? `${order.orderNumber} was updated.`
        : `${order.orderNumber} was created.`,
    );
    setPage(1);
    refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setDeleteError('');

    try {
      await api.orders.remove(deleteTarget.id);
      notify(`${deleteTarget.orderNumber} was deleted.`);
      setDeleteTarget(null);

      if (items.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        refresh();
      }
    } catch (deleteFailure) {
      setDeleteError(deleteFailure.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Orders"
        description="Track every order from pending through completion, with live totals."
        actions={
          <button className="btn btn--primary" type="button" onClick={() => setFormState({ order: null })}>
            <Icon name="plus" size={14} />
            New order
          </button>
        }
      />

      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

      <Panel
        title="Order Book"
        icon={ShoppingBag}
        aria-label="Order Book"
        action={
          <>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search order number or customer"
              label="Search orders"
            />
            <label className="relative">
              <span className="sr-only">Filter by status</span>
              <select
                className="control w-auto font-medium"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {ORDER_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {titleCase(option)}
                  </option>
                ))}
              </select>
            </label>
            {hasFilters ? (
              <button className="btn btn--ghost" type="button" onClick={clearFilters}>
                Clear
              </button>
            ) : null}
          </>
        }
        bodyClassName="overflow-hidden"
      >
        {showEmpty ? (
          <EmptyState
            icon="orders"
            title={hasFilters ? 'No orders match those filters' : 'No orders yet'}
            message={
              hasFilters
                ? 'Try a different search term or clear the status filter.'
                : 'Create the first order to start tracking revenue and fulfilment.'
            }
            action={
              hasFilters ? (
                <button className="btn btn--ghost" type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <button className="btn btn--primary" type="button" onClick={() => setFormState({ order: null })}>
                  Create order
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto" aria-busy={loading}>
            <table className="w-full min-w-180 text-left text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b bg-muted/50">
                  <SortHeader field="orderNumber" label="Order" sort={sort} onSort={changeSort} />
                  <SortHeader field="customerName" label="Customer" sort={sort} onSort={changeSort} />
                  <SortHeader field="totalAmount" label="Total" sort={sort} onSort={changeSort} />
                  <SortHeader field="status" label="Status" sort={sort} onSort={changeSort} />
                  <SortHeader field="createdAt" label="Placed" sort={sort} onSort={changeSort} />
                  <th className="w-20">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={6} columns={6} />
                ) : (
                  items.map((order) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-3">
                        <span className="block font-mono font-medium">{order.orderNumber}</span>
                        <span className="text-[11px] text-muted-foreground">{pluralize(order.items.length, 'line item')}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-linear-to-br from-slate-300 to-slate-500 text-[10px] font-semibold text-white dark:from-slate-500 dark:to-slate-700" aria-hidden="true">
                            {initials(order.customerName)}
                          </span>
                          {order.customerName}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-medium tabular-nums">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-3 py-3 tabular-nums">{formatDate(order.createdAt)}</td>
                      <td className="pr-2">
                        <div className="flex justify-end">
                          <button
                            className="icon-button"
                            type="button"
                            aria-label={`Edit ${order.orderNumber}`}
                            onClick={() => setFormState({ order })}
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button
                            className="icon-button icon-button--danger"
                            type="button"
                            aria-label={`Delete ${order.orderNumber}`}
                            onClick={() => {
                              setDeleteError('');
                              setDeleteTarget(order);
                            }}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {data ? (
          <Pagination
            page={data.page}
            pages={data.pages}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={setPage}
            label="orders"
          />
        ) : null}
      </Panel>

      {formState ? (
        <OrderForm
          order={formState.order}
          onClose={() => setFormState(null)}
          onSaved={handleSaved}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.orderNumber ?? 'order'}?`}
        message={`This permanently removes ${deleteTarget?.orderNumber ?? 'the order'} and its line items. This action cannot be undone.`}
        confirmLabel="Delete order"
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
