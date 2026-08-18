import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(srcRoot, rel), 'utf8');

test('mutating HTTP requests receive one idempotency key that survives retries', () => {
  const http = read('shared/api/http.js');
  assert.match(http, /function generateOperationId/);
  assert.match(http, /\['post', 'put', 'patch', 'delete'\]/);
  assert.match(http, /!config\.headers\['Idempotency-Key'\]/);
  assert.match(http, /config\.headers\['Idempotency-Key'\] = generateOperationId\(\)/);
  // The retry reuses the original Axios config rather than constructing a new intent.
  assert.match(http, /return http\.request\(original\)/);
});

test('journal creation reuses a stable operation id at both HTTP and domain payload layers', () => {
  const api = read('features/accounting/journals/api/journals.api.js');
  const form = read('features/accounting/journals/components/JournalDraftForm.jsx');
  assert.match(api, /'Idempotency-Key': idempotencyKey/);
  assert.match(form, /useRef\(/);
  assert.match(form, /createOperationId\.current/);
  assert.match(form, /idempotencyKey: createOperationId\.current/);
  assert.match(form, /api\.create\([\s\S]*createOperationId\.current/);
});
