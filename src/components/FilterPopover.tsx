import { memo, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface FilterPopoverProps {
  open: boolean;
  onClose: () => void;
  onClear?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

function FilterPopover({ open, onClose, onClear, children, footer }: FilterPopoverProps) {
  if (!open) return null;

  return (
    <div className="filters-popover-content">
      <div className="filters-popover-header">
        <p>Filtros</p>
        <div className="filters-popover-actions">
          {onClear && (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                onClear();
              }}
            >
              Limpar
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              onClose();
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="filters-popover-body">{children}</div>
      {footer && <div className="filters-popover-footer">{footer}</div>}
    </div>
  );
}

// Memoizar para evitar re-renders quando props não mudam (especialmente quando fechado)
export default memo(FilterPopover);

