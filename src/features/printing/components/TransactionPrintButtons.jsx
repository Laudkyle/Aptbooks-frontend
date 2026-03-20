import React from 'react';
import { Eye, Printer } from 'lucide-react';

import { Button } from '../../../shared/components/ui/Button.jsx';
import { ROUTES } from '../../../app/constants/routes.js';

export function TransactionPrintButtons({ documentType, documentId }) {
  if (!documentType || !documentId) return null;

  const openPreview = (autoprint = false) => {
    const url = `${ROUTES.printingPreview(documentType, documentId)}${autoprint ? '?autoprint=1' : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" leftIcon={Eye} onClick={() => openPreview(false)}>
        Preview
      </Button>
      <Button type="button" variant="outline" size="sm" leftIcon={Printer} onClick={() => openPreview(true)}>
        Print
      </Button>
    </>
  );
}
