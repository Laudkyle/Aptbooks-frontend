import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(here, '..');

function read(rel) { return fs.readFileSync(path.join(srcRoot, rel), 'utf8'); }

test('document preview no longer exposes development coverage diagnostics', () => {
  const src = read('features/printing/pages/PreviewPage.jsx');
  assert.doesNotMatch(src, /Coverage checklist|Expected sections|Critical fields|getTemplateSpec/);
  assert.match(src, /title="Document preview"/);
  assert.match(src, /iframeRef\.current\?\.contentWindow\?\.print\(\)/);
});

test('template management no longer exposes expected-field development diagnostics', () => {
  const src = read('features/printing/pages/TemplatesPage.jsx');
  assert.doesNotMatch(src, /Transaction Coverage|Expected coverage|Expected sections|Required print sections|Key fields to preserve|Baseline expectation/);
  assert.match(src, /Sample Preview/);
  assert.match(src, /TRANSACTION_DOCUMENT_TYPE_OPTIONS/);
});
