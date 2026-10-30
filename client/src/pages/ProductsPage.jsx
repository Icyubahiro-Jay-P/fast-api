import { Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Panel from '../components/Panel.jsx';
import Pagination from '../components/Pagination.jsx';
import ProductForm from '../components/ProductForm.jsx';
import SearchInput from '../components/SearchInput.jsx';
import SortHeader from '../components/SortHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TableSkeleton from '../components/TableSkeleton.jsx';
import { useToast } from '../context/toast.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { LOW_STOCK_THRESHOLD, PRODUCT_STATUSES } from '../utils/constants.js';
import { cx, formatCurrency, formatNumber, titleCase } from '../utils/format.js';

const PAGE_SIZE = 10;

export default function ProductsPage() {
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

    api.products
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

  function handleSaved(product, editing) {
    setFormState(null);
    notify(
      editing ? `${product.name} was updated.` : `${product.name} was added to the catalog.`,
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
      await api.products.remove(deleteTarget.id);
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
        title="Products"
        description="Manage pricing, stock, and availability across the product catalog."
        actions={
          <button className="btn btn--primary" type="button" onClick={() => setFormState({ product: null })}>
            <Icon name="plus" size={14} />
            Add product
          </button>
        }
      />

      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

      <Panel
        title="Product Catalog"
        icon={Package}
        aria-label="Product Catalog"
        action={
          <>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search name, SKU, or category"
              label="Search products"
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
                {PRODUCT_STATUSES.map((option) => (
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
            icon="products"
            title={hasFilters ? 'No products match those filters' : 'The catalog is empty'}
            message={
              hasFilters
                ? 'Try a different search term or clear the status filter.'
                : 'Add the first product so it can be included in customer orders.'
            }
            action={
              hasFilters ? (
                <button className="btn btn--ghost" type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <button className="btn btn--primary" type="button" onClick={() => setFormState({ product: null })}>
                  Add product
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto" aria-busy={loading}>
            <table className="w-full min-w-180 text-left text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b bg-muted/50">
                  <SortHeader field="name" label="Product" sort={sort} onSort={changeSort} />
                  <SortHeader field="sku" label="SKU" sort={sort} onSort={changeSort} />
                  <SortHeader field="category" label="Category" sort={sort} onSort={changeSort} />
                  <SortHeader field="price" label="Price" sort={sort} onSort={changeSort} />
                  <SortHeader field="stock" label="Stock" sort={sort} onSort={changeSort} />
                  <SortHeader field="status" label="Status" sort={sort} onSort={changeSort} />
                  <th className="w-20">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton rows={6} columns={7} />
                ) : (
                  items.map((product) => {
                    const lowStock = product.status === 'active' && product.stock <= LOW_STOCK_THRESHOLD;

                    return (
                      <tr key={product.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="grid size-7 shrink-0 place-items-center rounded-lg border bg-card shadow-xs" aria-hidden="true">
                              <Icon name="box" size={14} className="text-muted-foreground" />
                            </span>
                            <span className="font-medium">{product.name}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-muted-foreground">{product.sku}</td>
                        <td className="px-3 py-3">{titleCase(product.category)}</td>
                        <td className="px-3 py-3 tabular-nums">{formatCurrency(product.price)}</td>
                        <td className={cx('px-3 py-3 tabular-nums', lowStock && 'font-medium text-red-500')}>
                          {formatNumber(product.stock)}
                          {lowStock ? <span className="ml-1.5 text-[11px]">Low</span> : null}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={product.status} />
                        </td>
                      <td className="pr-2">
                        <div className="flex justify-end">
                          <button
                            className="icon-button"
                            type="button"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => setFormState({ product })}
                          >
                            <Icon name="edit" size={14} />
                          </button>
                          <button
                            className="icon-button icon-button--danger"
                            type="button"
                            aria-label={`Delete ${product.name}`}
                            onClick={() => {
                              setDeleteError('');
                              setDeleteTarget(product);
                            }}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </td>
                      </tr>
                    );
                  })
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
            label="products"
          />
        ) : null}
      </Panel>

      {formState ? (
        <ProductForm
          product={formState.product}
          onClose={() => setFormState(null)}
          onSaved={handleSaved}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name ?? 'product'}?`}
        message={`This permanently removes ${deleteTarget?.name ?? 'the product'} from the catalog. Products referenced by orders cannot be deleted.`}
        confirmLabel="Delete product"
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
