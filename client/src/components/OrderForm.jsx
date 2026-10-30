import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { ORDER_STATUSES } from '../utils/constants.js';
import { errorFor, parseApiError } from '../utils/errors.js';
import { formatCurrency, titleCase } from '../utils/format.js';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';

function initialItems(order) {
  if (order?.items?.length) {
    return order.items.map((item) => ({
      productId: String(item.productId),
      quantity: item.quantity,
    }));
  }

  return [{ productId: '', quantity: 1 }];
}

export default function OrderForm({ order, onClose, onSaved }) {
  const editing = Boolean(order);
  const [customerId, setCustomerId] = useState(order ? String(order.customerId) : '');
  const [status, setStatus] = useState(order?.status ?? 'pending');
  const [items, setItems] = useState(() => initialItems(order));
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingReferences, setLoadingReferences] = useState(true);
  const [referenceError, setReferenceError] = useState('');
  const [reloadReferences, setReloadReferences] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [messages, setMessages] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReferences() {
      setLoadingReferences(true);
      setReferenceError('');

      try {
        const [customerPage, productPage] = await Promise.all([
          api.customers.list({ pageSize: 100, sort: 'name:asc' }, controller.signal),
          api.products.list({ pageSize: 100, sort: 'name:asc' }, controller.signal),
        ]);

        setCustomers(customerPage.items);
        setProducts(productPage.items);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setReferenceError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingReferences(false);
        }
      }
    }

    loadReferences();

    return () => controller.abort();
  }, [reloadReferences]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        const product = productMap.get(item.productId);
        return sum + (product ? product.price * item.quantity : 0);
      }, 0),
    [items, productMap],
  );

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
    setFieldErrors((current) => {
      const key = `items.${index}.${field}`;
      const next = { ...current };
      delete next[key];
      delete next[`items.${index}.productId`];
      return next;
    });
  }

  function addItem() {
    setItems((current) => [...current, { productId: '', quantity: 1 }]);
  }

  function removeItem(index) {
    setItems((current) => current.filter((_item, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};

    if (!editing && !customerId) {
      nextErrors.customerId = 'Select the customer placing this order.';
    }

    if (items.length === 0) {
      nextErrors.items = 'Add at least one product to the order.';
    }

    const seen = new Set();

    items.forEach((item, index) => {
      if (!item.productId) {
        nextErrors[`items.${index}.productId`] = 'Choose a product.';
      } else if (seen.has(item.productId)) {
        nextErrors[`items.${index}.productId`] =
          'This product is already in the order. Change its quantity instead.';
      }

      seen.add(item.productId);

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        nextErrors[`items.${index}.quantity`] = 'Quantity must be a whole number of at least 1.';
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setMessages([]);
      return;
    }

    setSaving(true);
    setMessages([]);
    setFieldErrors({});

    const payload = {
      status,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    };

    if (!editing) {
      payload.customerId = customerId;
    }

    try {
      const saved = editing
        ? await api.orders.update(order.id, payload)
        : await api.orders.create(payload);

      onSaved(saved, editing);
    } catch (error) {
      const parsed = parseApiError(error);
      setFieldErrors(parsed.fieldErrors);
      setMessages(parsed.messages);
    } finally {
      setSaving(false);
    }
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const canAddItem = items.length < Math.min(products.length || 1, 50);
  const referencesReady = !loadingReferences && !referenceError;

  return (
    <Modal
      open
      onClose={saving ? () => {} : onClose}
      title={editing ? `Edit ${order.orderNumber}` : 'Create order'}
      description={
        editing
          ? 'Change the order status or replace its line items.'
          : 'Choose a customer, then add the products in this order.'
      }
      size="lg"
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {messages.length > 0 || hasFieldErrors ? (
          <div className="form-alert" role="alert">
            {messages.map((message) => (
              <p key={message}>{message}</p>
            ))}
            {hasFieldErrors ? <p>Review the highlighted order details below.</p> : null}
          </div>
        ) : null}

        {referenceError ? (
          <div className="form-alert" role="alert">
            <p>{referenceError}</p>
            <button
              className="btn btn--small btn--ghost"
              type="button"
              onClick={() => setReloadReferences((value) => value + 1)}
            >
              Retry loading customers and products
            </button>
          </div>
        ) : null}

        <div className="form__grid form__grid--2">
          {editing ? (
            <div className="form__field">
              <label htmlFor="order-customer">Customer</label>
              <input id="order-customer" value={order.customerName} readOnly />
              <p className="field-hint">The customer cannot change after an order is created.</p>
            </div>
          ) : (
            <div className="form__field">
              <label htmlFor="order-customer">Customer</label>
              <select
                id="order-customer"
                value={customerId}
                onChange={(event) => {
                  setCustomerId(event.target.value);
                  setFieldErrors((current) => {
                    const next = { ...current };
                    delete next.customerId;
                    return next;
                  });
                }}
                disabled={loadingReferences || Boolean(referenceError)}
                aria-invalid={Boolean(errorFor(fieldErrors, 'customerId'))}
              >
                <option value="">
                  {loadingReferences ? 'Loading customers...' : 'Select a customer'}
                </option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.email}
                  </option>
                ))}
              </select>
              {errorFor(fieldErrors, 'customerId') ? (
                <p className="field-error">{errorFor(fieldErrors, 'customerId')}</p>
              ) : null}
              {!loadingReferences && customers.length === 0 ? (
                <p className="field-hint">Add a customer before creating an order.</p>
              ) : null}
            </div>
          )}

          <div className="form__field">
            <label htmlFor="order-status">Order status</label>
            <select
              id="order-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {ORDER_STATUSES.map((orderStatus) => (
                <option key={orderStatus} value={orderStatus}>
                  {titleCase(orderStatus)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border bg-muted/40 p-3" role="group" aria-labelledby="order-lines-title">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium" id="order-lines-title">
              Line items
            </h3>
            <button
              className="btn btn--small btn--ghost"
              type="button"
              onClick={addItem}
              disabled={!referencesReady || !canAddItem}
            >
              <Icon name="plus" size={14} />
              Add item
            </button>
          </div>

          <div className="hidden grid-cols-[1fr_5.5rem_6.5rem_2rem] gap-2 px-0.5 text-[11px] text-muted-foreground uppercase sm:grid" aria-hidden="true">
            <span>Product</span>
            <span>Quantity</span>
            <span>Line total</span>
            <span />
          </div>

          {items.map((item, index) => {
            const product = productMap.get(item.productId);
            const quantity = Number(item.quantity) || 0;
            const lineTotal = product ? product.price * quantity : 0;
            const productError = errorFor(fieldErrors, `items.${index}.productId`);
            const quantityError = errorFor(fieldErrors, `items.${index}.quantity`);

            return (
              <div className="grid grid-cols-[1fr_auto_auto] items-start gap-2 sm:grid-cols-[1fr_5.5rem_6.5rem_2rem]" key={index}>
                <div className="form__field col-span-3 sm:col-span-1">
                  <label className="sr-only" htmlFor={`order-product-${index}`}>
                    Product for line {index + 1}
                  </label>
                  <select
                    id={`order-product-${index}`}
                    value={item.productId}
                    onChange={(event) => updateItem(index, 'productId', event.target.value)}
                    disabled={loadingReferences || Boolean(referenceError)}
                    aria-invalid={Boolean(productError)}
                  >
                    <option value="">Select a product</option>
                    {products.map((option) => {
                      const selectedElsewhere = items.some(
                        (other, otherIndex) =>
                          otherIndex !== index && other.productId === option.id,
                      );

                      return (
                        <option
                          key={option.id}
                          value={option.id}
                          disabled={selectedElsewhere}
                        >
                          {option.name} ({option.sku}) - {formatCurrency(option.price)} -{' '}
                          {option.stock} in stock
                        </option>
                      );
                    })}
                  </select>
                  {productError ? <p className="field-error">{productError}</p> : null}
                </div>

                <div className="form__field">
                  <label className="sr-only" htmlFor={`order-quantity-${index}`}>
                    Quantity for line {index + 1}
                  </label>
                  <input
                    id={`order-quantity-${index}`}
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                    aria-invalid={Boolean(quantityError)}
                  />
                  {quantityError ? <p className="field-error">{quantityError}</p> : null}
                </div>

                <div className="flex flex-col justify-center text-xs sm:min-h-8">
                  <span className="sr-only">Line total</span>
                  <strong className="font-medium tabular-nums">{formatCurrency(lineTotal)}</strong>
                  <span className="text-[11px] text-muted-foreground">
                    {product ? `${formatCurrency(product.price)} each` : 'Pick a product'}
                  </span>
                </div>

                <button
                  className="icon-button icon-button--bordered icon-button--danger"
                  type="button"
                  aria-label={`Remove line ${index + 1}`}
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            );
          })}

          {products.length === 0 && !loadingReferences && !referenceError ? (
            <p className="field-hint">Add at least one product before creating an order.</p>
          ) : null}
        </div>

        <div className="flex items-baseline justify-between rounded-xl border border-dashed px-3 py-2.5">
          <span className="text-xs text-muted-foreground">Order total</span>
          <strong className="text-xl font-semibold tracking-tight tabular-nums">{formatCurrency(total)}</strong>
        </div>

        <div className="form__actions">
          <button className="btn btn--ghost" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            type="submit"
            disabled={saving || loadingReferences || Boolean(referenceError)}
          >
            {saving ? 'Saving...' : editing ? 'Save order' : 'Create order'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
