import React from 'react'; 
import { Modal } from './Modal.jsx'; 
import { Button } from './Button.jsx'; 

export function ConfirmDialog({ open, title = 'Confirm', message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onClose, danger }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmText}</Button>
        </div>
      }
    >
      <div className="text-sm text-slate-700">{message}</div>
    </Modal>
  ); 
}
