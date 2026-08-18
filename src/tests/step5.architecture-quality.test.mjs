import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SRC, runArchitectureChecks } from '../quality/architecture-gates.mjs';

const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

test('frontend architecture gates pass', () => {
  assert.deepEqual(runArchitectureChecks(), []);
});

test('routing and navigation are decomposed into dedicated policy modules', () => {
  const routes = read('app/routes/index.jsx');
  const lazyPages = read('app/routes/lazy-pages.jsx');
  const sideNav = read('shared/components/layout/SideNav.jsx');
  const manifest = read('app/navigation/side-nav.manifest.js');
  assert.ok(routes.split(/\r?\n/).length < 2500);
  assert.match(routes, /from "\.\/lazy-pages\.jsx"/);
  assert.match(lazyPages, /export const Login = lazy/);
  assert.ok(sideNav.split(/\r?\n/).length < 150);
  assert.doesNotMatch(sideNav, /PERMISSIONS\./);
  assert.match(manifest, /routeAny|routeAll/);
  assert.ok((manifest.match(/routeKey:/g) || []).length >= 130);
});

test('runtime logging is centralized and avoids financial payload dumps', () => {
  const clientLogger = read('shared/utils/clientLogger.js');
  assert.match(clientLogger, /free of business payloads/);
  assert.doesNotMatch(read('features/transactions/phase1/OperationalDocCreate.jsx'), /Using idempotency key/);
  assert.doesNotMatch(read('features/transactions/pages/CustomerReceiptList.jsx'), /console\.log/);
});
