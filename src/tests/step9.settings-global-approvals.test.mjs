import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('shared Select supports both options prop and normal option children', () => {
  const src = read('shared/components/ui/Select.jsx');
  assert.match(src, /options, children/);
  assert.match(src, /children \?\? \(options \?\? \[\]\)\.map/);
});

test('workflow rule entity type is a backend-sourced select', () => {
  const page = read('features/foundation/settings/pages/SystemSettings.jsx');
  const api = read('features/foundation/settings/api/documents.api.js');
  assert.match(api, /listEntityTypes/);
  assert.match(api, /\/workflow\/documents\/entity-types/);
  assert.match(page, /workflow-entity-types/);
  assert.match(page, /All entity types/);
  assert.doesNotMatch(page, /placeholder="e\.g\. invoice, bill"/);
});

test('onboarding explains the global Admin approval fallback', () => {
  const src = read('features/foundation/onboarding/components/OrganizationOnboardingGate.jsx');
  assert.match(src, /Default approver: Admin/);
  assert.match(src, /global approval ladder/);
  assert.match(src, /Require approval for workflow documents/);
  assert.match(src, /document-specific override/);
});
