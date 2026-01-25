import { generateRequestId } from './request-id.js'; 

export function ensureIdempotencyKey(headers = {}) {
  if (headers['Idempotency-Key'] || headers['idempotency-key']) return headers; 
  return { ...headers, 'Idempotency-Key': generateRequestId() }; 
}
