import { useMemo } from 'react';
import { generateRequestId } from '../api/request-id.js';

export function useRequestId() {
  return useMemo(() => generateRequestId(), []);
}
