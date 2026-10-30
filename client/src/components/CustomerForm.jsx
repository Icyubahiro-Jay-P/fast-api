import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { CUSTOMER_STATUSES } from '../utils/constants.js';
import { errorFor, parseApiError } from '../utils/errors.js';
import { titleCase } from '../utils/format.js';
import Modal from './Modal.jsx';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  status: 'active',
};

export default function CustomerForm({ customer, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [messages, setMessages] = useState([]);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(customer);

  useEffect(() => {
    if (!customer) {
      setForm(emptyForm);
      return;
    }

    setForm({
      name: customer.name ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      status: customer.status ?? 'active',
    });
  }, [customer]);

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

    if (form.name.trim().length < 2) {
      nextErrors.name = 'Enter a name with at least 2 characters.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (form.phone.trim().length > 30) {
      nextErrors.phone = 'Phone numbers cannot exceed 30 characters.';
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
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      status: form.status,
    };

    try {
      const saved = editing
        ? await api.customers.update(customer.id, payload)
        : await api.customers.create(payload);

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
      title={editing ? 'Edit customer' : 'Add customer'}
      description={
        editing
          ? 'Update contact details or account status.'
          : 'Create a customer record to attach orders to.'
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {messages.length > 0 ? (
          <div className="form-alert" role="alert">
            {messages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}

        <div className="form__field">
          <label htmlFor="customer-name">Full name</label>
          <input
            id="customer-name"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            aria-invalid={Boolean(errorFor(fieldErrors, 'name'))}
            autoComplete="name"
            placeholder="e.g. Amara Okafor"
          />
          {errorFor(fieldErrors, 'name') ? (
            <p className="field-error">{errorFor(fieldErrors, 'name')}</p>
          ) : null}
        </div>

        <div className="form__field">
          <label htmlFor="customer-email">Email address</label>
          <input
            id="customer-email"
            type="email"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            aria-invalid={Boolean(errorFor(fieldErrors, 'email'))}
            autoComplete="email"
            placeholder="name@company.com"
          />
          {errorFor(fieldErrors, 'email') ? (
            <p className="field-error">{errorFor(fieldErrors, 'email')}</p>
          ) : null}
        </div>

        <div className="form__grid form__grid--2">
          <div className="form__field">
            <label htmlFor="customer-phone">Phone</label>
            <input
              id="customer-phone"
              type="tel"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              aria-invalid={Boolean(errorFor(fieldErrors, 'phone'))}
              autoComplete="tel"
              placeholder="+1 555 0100"
            />
            {errorFor(fieldErrors, 'phone') ? (
              <p className="field-error">{errorFor(fieldErrors, 'phone')}</p>
            ) : null}
          </div>

          <div className="form__field">
            <label htmlFor="customer-status">Status</label>
            <select
              id="customer-status"
              value={form.status}
              onChange={(event) => updateField('status', event.target.value)}
            >
              {CUSTOMER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form__actions">
          <button className="btn btn--ghost" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn--primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Save changes' : 'Create customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
