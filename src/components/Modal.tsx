import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ isOpen, title, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        onClose();
      }}
    >
      <div
        className="modal modal-rounded"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="modal-header">
          <h3>{title}</h3>
          <button
            className="modal-close icon"
            onClick={() => {
              onClose();
            }}
            aria-label="Fechar modal"
          >
            <span>✕</span>
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

