import { Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import CustomerForm from '../components/CustomerForm.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Panel from '../components/Panel.jsx';
import Pagination from '../components/Pagination.jsx';
import SearchInput from '../components/SearchInput.jsx';
import SortHeader from '../components/SortHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TableSkeleton from '../components/TableSkeleton.jsx';
import { useToast } from '../context/toast.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { CUSTOMER_STATUSES } from '../utils/constants.js';
import { formatDate, initials, titleCase } from '../utils/format.js';

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [formState, setFormState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError('');

    api.customers
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

  function handleSaved(customer, editing) {
    setFormState(null);
    notify(
      editing ? `${customer.name} was updated.` : `${customer.name} was added to customers.`,
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
      await api.customers.remove(deleteTarget.id);
      notify(`${deleteTarget.name} was deleted.`);
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
        title="Customers"
        description="Every account in the workspace, with contact details and status."
        actions={
          <button className="btn btn--primary" type="button" onClick={() => setFormState({ customer: null })}>
            <Icon name="plus" size={14} />
            Add customer
          </button>
        }
      />

      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

      <Panel
        title="Customer List"
        icon={Users}
        aria-label="Customer List"
        action={
          <>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search name, email, or phone"
              label="Search customers"
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
                {CUSTOMER_STATUSES.map((option) => (
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
            icon="customers"
            title={hasFilters ? 'No customers match those filters' : 'No customers yet'}
            message={
              hasFilters
                ? 'Try a different search term or clear the status filter.'
                : 'Add the first customer to start building the order book.'
            }
            action={
              hasFilters ? (
                <button className="btn btn--ghost" type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <button className="btn btn--primary" type="button" onClick={() => setFormState({ customer: null })}>
                  Add customer
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto" aria-busy={loading}>
            <table className="w-full min-w-180 text-left text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b bg-muted/50">
                  <SortHeader field="name" label="Customer" sort={sort} onSort={changeSort} />
                  <SortHeader field="email" label="Email" sort={sort} onSort={changeSort} />
                  <th className="px-3 py-2.5 font-medium">Phone</th>
                  <SortHeader field="status" label="Status" sort={sort} onSort={changeSort} />
                  <SortHeader field="createdAt" label="Joined" sort={sort} onSort={changeSort} />
                  <th className="w-20">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={6} columns={6} />
                ) : (
                  items.map((customer) => (
                    <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-linear-to-br from-slate-300 to-slate-500 text-[10px] font-semibold text-white dark:from-slate-500 dark:to-slate-700" aria-hidden="true">
                            {initials(customer.name)}
                          </span>
                          <span className="font-medium">{customer.name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{customer.email}</td>
                      <td className="px-3 py-3">{customer.phone || 'Not provided'}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={customer.status} />
                      </td>
                      <td className="px-3 py-3 tabular-nums">{formatDate(customer.createdAt)}</td>
                      <td className="pr-2">
                        <div className="flex justify-end">
                          <button
                            className="icon-button"
                            type="button"
                            aria-label={`Edit ${customer.name}`}
                            onClick={() => setFormState({ customer })}
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button
                            className="icon-button icon-button--danger"
                            type="button"
                            aria-label={`Delete ${customer.name}`}
                            onClick={() => {
                              setDeleteError('');
                              setDeleteTarget(customer);
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
            label="customers"
          />
        ) : null}
      </Panel>

      {formState ? (
        <CustomerForm
          customer={formState.customer}
          onClose={() => setFormState(null)}
          onSaved={handleSaved}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name ?? 'customer'}?`}
        message={`This permanently removes ${deleteTarget?.name ?? 'the customer'}. Customers with existing orders cannot be deleted.`}
        confirmLabel="Delete customer"
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
