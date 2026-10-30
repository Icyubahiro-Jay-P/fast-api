import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { PRODUCT_STATUSES } from '../utils/constants.js';
import { errorFor, parseApiError } from '../utils/errors.js';
import { titleCase } from '../utils/format.js';
import Modal from './Modal.jsx';

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  price: '',
  stock: '0',
  status: 'active',
};

export default function ProductForm({ product, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [messages, setMessages] = useState([]);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(product);

  useEffect(() => {
    if (!product) {
      setForm(emptyForm);
      return;
    }

    setForm({
      name: product.name ?? '',
      sku: product.sku ?? '',
      category: product.category ?? '',
      price: String(product.price ?? ''),
      stock: String(product.stock ?? 0),
      status: product.status ?? 'active',
    });
  }, [product]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (form.name.trim().length < 2) {
      nextErrors.name = 'Enter a product name with at least 2 characters.';
    }

    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,31}$/.test(form.sku.trim())) {
      nextErrors.sku = 'Use 2-32 letters, numbers, dashes, or underscores.';
    }

    if (form.category.trim().length < 2) {
      nextErrors.category = 'Enter a category with at least 2 characters.';
    }

    if (!Number.isFinite(price) || price < 0.01) {
      nextErrors.price = 'Price must be at least $0.01.';
    }

    if (!Number.isInteger(stock) || stock < 0) {
      nextErrors.stock = 'Stock must be a whole number of zero or more.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setMessages([]);
      return;
    }

    setSaving(true);
    setMessages([]);

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category.trim(),
      price,
      stock,
      status: form.status,
    };

    try {
      const saved = editing
        ? await api.products.update(product.id, payload)
        : await api.products.create(payload);

      onSaved(saved, editing);
    } catch (error) {
      const parsed = parseApiError(error);
      setFieldErrors(parsed.fieldErrors);
      setMessages(parsed.messages);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Edit product' : 'Add product'}
      description={
        editing
          ? 'Adjust pricing, inventory, or catalog visibility.'
          : 'Add an item to the catalog so it can be ordered.'
      }
      size="lg"
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {messages.length > 0 ? (
          <div className="form-alert" role="alert">
            {messages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}

        <div className="form__grid form__grid--2">
          <div className="form__field">
            <label htmlFor="product-name">Product name</label>
            <input
              id="product-name"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              aria-invalid={Boolean(errorFor(fieldErrors, 'name'))}
              placeholder="e.g. Studio Headphones"
            />
            {errorFor(fieldErrors, 'name') ? (
              <p className="field-error">{errorFor(fieldErrors, 'name')}</p>
            ) : null}
          </div>

          <div className="form__field">
            <label htmlFor="product-sku">SKU</label>
            <input
              id="product-sku"
              value={form.sku}
              onChange={(event) => updateField('sku', event.target.value.toUpperCase())}
              aria-invalid={Boolean(errorFor(fieldErrors, 'sku'))}
              placeholder="AUD-001"
              spellCheck="false"
            />
            {errorFor(fieldErrors, 'sku') ? (
              <p className="field-error">{errorFor(fieldErrors, 'sku')}</p>
            ) : null}
          </div>

          <div className="form__field">
            <label htmlFor="product-category">Category</label>
            <input
              id="product-category"
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
              aria-invalid={Boolean(errorFor(fieldErrors, 'category'))}
              placeholder="Audio"
            />
            {errorFor(fieldErrors, 'category') ? (
              <p className="field-error">{errorFor(fieldErrors, 'category')}</p>
            ) : null}
          </div>

          <div className="form__field">
            <label htmlFor="product-status">Status</label>
            <select
              id="product-status"
              value={form.status}
              onChange={(event) => updateField('status', event.target.value)}
            >
              {PRODUCT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ))}
            </select>
          </div>

          <div className="form__field">
            <label htmlFor="product-price">Price (USD)</label>
            <input
              id="product-price"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              aria-invalid={Boolean(errorFor(fieldErrors, 'price'))}
              placeholder="49.00"
            />
            {errorFor(fieldErrors, 'price') ? (
              <p className="field-error">{errorFor(fieldErrors, 'price')}</p>
            ) : null}
          </div>

          <div className="form__field">
            <label htmlFor="product-stock">Units in stock</label>
            <input
              id="product-stock"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={form.stock}
              onChange={(event) => updateField('stock', event.target.value)}
              aria-invalid={Boolean(errorFor(fieldErrors, 'stock'))}
            />
            {errorFor(fieldErrors, 'stock') ? (
              <p className="field-error">{errorFor(fieldErrors, 'stock')}</p>
            ) : null}
          </div>
        </div>

        <div className="form__actions">
          <button className="btn btn--ghost" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn--primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
