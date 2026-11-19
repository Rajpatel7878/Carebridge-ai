import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: 'primary' | 'danger';
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  intent = 'primary',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={intent === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <div
          className={
            intent === 'danger'
              ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cb-critical-soft)] text-[var(--cb-critical)]'
              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cb-primary-soft)] text-[var(--cb-primary)]'
          }
        >
          {intent === 'danger' ? (
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        <p className="text-sm leading-relaxed text-[var(--cb-text-secondary)]">
          {description}
        </p>
      </div>
    </Modal>
  );
}
