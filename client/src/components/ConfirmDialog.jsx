import Modal from './Modal.jsx';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  loading = false,
  error,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose} disabled={loading}>
            Keep it
          </button>
          <button
            className="btn btn--danger"
            type="button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{message}</p>
      {error ? (
        <div className="form-alert mt-3" role="alert">
          {error}
        </div>
      ) : null}
    </Modal>
  );
}
