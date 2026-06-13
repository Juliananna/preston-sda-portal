import React from 'react';

export default function Modal({ title, children, onClose, footer }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target.classList.contains('modal-backdrop') && onClose?.()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-light btn-sm" onClick={onClose}>Close</button>
        </div>
        {children}
        {footer && <div className="actions" style={{ justifyContent: 'flex-end', marginTop: 16 }}>{footer}</div>}
      </div>
    </div>
  );
}
