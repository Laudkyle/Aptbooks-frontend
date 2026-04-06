import { CheckCircle2, Send, ShieldCheck, ShieldX, Trash2 } from 'lucide-react';

import { Button } from '../../../shared/components/ui/Button.jsx';
import { TransactionPrintButtons } from '../../printing/components/TransactionPrintButtons.jsx';

const icons = {
  submit: Send,
  approve: ShieldCheck,
  issue: CheckCircle2,
  post: CheckCircle2,
  apply: CheckCircle2,
  reject: ShieldX,
  void: Trash2
};

function ActionButton({ action, onClick, size = 'sm' }) {
  if (!action) return null;
  const Icon = icons[action.key];
  return (
    <Button
      size={size}
      onClick={() => onClick(action.key)}
      className={`${action.className}`}
    >
      {Icon ? <Icon className="h-4 w-4 mr-2" /> : null}
      {action.label}
    </Button>
  );
}

export function TransactionWorkflowActionBar({ actions, onAction, documentType, documentId }) {
  // Create a default submit action if no actions are provided
  const defaultSubmitAction = {
    key: 'submit',
    label: 'Submit',
    className: ''
  };

  // Use provided actions or fall back to default submit action
  const forwardAction = actions?.forwardAction ;
  const rejectAction = actions?.rejectAction;
  const voidAction = actions?.voidAction;

  const hasAnyAction = Boolean(forwardAction || rejectAction || voidAction || (documentType && documentId));
  if (!hasAnyAction) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Actions:</span>
        <ActionButton action={forwardAction} onClick={onAction} size="sm" />
        <ActionButton action={rejectAction} onClick={onAction}  size="sm" />
        <ActionButton action={voidAction} onClick={onAction}  size="sm" />
        <div className="ml-auto flex items-center gap-2">
          <TransactionPrintButtons documentType={documentType} documentId={documentId} />
        </div>
      </div>
    </div>
  );
}