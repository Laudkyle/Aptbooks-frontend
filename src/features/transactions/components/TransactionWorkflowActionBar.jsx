import React from 'react';
import { CheckCircle2, Send, ShieldCheck, ShieldX, Trash2 } from 'lucide-react';

import { Button } from '../../../shared/components/ui/Button.jsx';

const icons = {
  submit: Send,
  approve: ShieldCheck,
  issue: CheckCircle2,
  post: CheckCircle2,
  apply: CheckCircle2,
  reject: ShieldX,
  void: Trash2
};

function ActionButton({ action, onClick, variant = 'outline', size = 'sm' }) {
  if (!action) return null;
  const Icon = icons[action.key];
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => onClick(action.key)}
      className={action.className}
    >
      {Icon ? <Icon className="h-4 w-4 mr-2" /> : null}
      {action.label}
    </Button>
  );
}

export function TransactionWorkflowActionBar({ actions, onAction }) {
  const hasAnyAction = Boolean(actions?.forwardAction || actions?.rejectAction || actions?.voidAction);
  if (!hasAnyAction) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Actions:</span>
        <ActionButton action={actions.forwardAction} onClick={onAction} size="sm" />
        <ActionButton action={actions.rejectAction} onClick={onAction} variant="outline" size="sm" />
        <ActionButton action={actions.voidAction} onClick={onAction} variant="outline" size="sm" />
      </div>
    </div>
  );
}
