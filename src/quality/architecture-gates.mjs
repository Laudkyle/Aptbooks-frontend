import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.resolve(here, '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

function parseObjectKeys(source) {
  return new Set([...source.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((m) => m[1]));
}

function parseRoutePolicies(source) {
  const matches = [...source.matchAll(/path:\s*ROUTES\.([A-Za-z0-9_]+)(?:\([^\n]*?\))?\s*,/g)];
  const policies = new Map();
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const end = matches[i + 1]?.index ?? source.length;
    const segment = source.slice(match.index + match[0].length, end);
    const gate = segment.match(/<RequirePermission\s+(any|all)=\{\[([^\]]*)\]\}/s);
    if (!gate || policies.has(match[1])) continue;
    policies.set(match[1], {
      kind: gate[1],
      permissions: [...gate[2].matchAll(/PERMISSIONS\.([A-Za-z0-9_]+)/g)].map((m) => m[1]),
    });
  }
  return policies;
}

function parseManifestItems(source) {
  const starts = [...source.matchAll(/^\s{6}\{ to: ROUTES\.([A-Za-z0-9_]+), routeKey: "([^"]+)"/gm)];
  return starts.map((match, index) => {
    const end = starts[index + 1]?.index ?? source.length;
    const segment = source.slice(match.index, end);
    return {
      route: match[1],
      routeKey: match[2],
      routeAny: [...((segment.match(/routeAny:\s*\[([^\]]*)\]/s) || [,''])[1]).matchAll(/PERMISSIONS\.([A-Za-z0-9_]+)/g)].map((m) => m[1]),
      routeAll: [...((segment.match(/routeAll:\s*\[([^\]]*)\]/s) || [,''])[1]).matchAll(/PERMISSIONS\.([A-Za-z0-9_]+)/g)].map((m) => m[1]),
    };
  });
}

export function runArchitectureChecks() {
  const errors = [];
  const sideNav = read('shared/components/layout/SideNav.jsx');
  const manifest = read('app/navigation/side-nav.manifest.js');
  const routes = read('app/constants/routes.js');
  const permissions = read('app/constants/permissions.js');
  const routeRegistry = read('app/routes/index.jsx');
  const lazyPages = read('app/routes/lazy-pages.jsx');

  if (sideNav.split(/\r?\n/).length > 150) errors.push('shared/components/layout/SideNav.jsx must remain a small manifest renderer');
  if (/PERMISSIONS\./.test(sideNav)) errors.push('SideNav.jsx must not duplicate permission declarations');
  if (!/SIDE_NAV_GROUPS/.test(sideNav)) errors.push('SideNav.jsx must render the declarative navigation manifest');
  if (routeRegistry.split(/\r?\n/).length > 2500) errors.push('app/routes/index.jsx exceeded the route-registry line budget');
  if (/\blazy\s*\(/.test(routeRegistry)) errors.push('lazy page imports belong in app/routes/lazy-pages.jsx');
  if (lazyPages.split(/\r?\n/).length > 700) errors.push('app/routes/lazy-pages.jsx exceeded its import-module line budget');

  const routeKeys = parseObjectKeys(routes);
  const permissionKeys = parseObjectKeys(permissions);
  const items = parseManifestItems(manifest);
  const itemRouteKeys = new Set();
  for (const item of items) {
    if (item.route !== item.routeKey) errors.push(`navigation routeKey mismatch: ${item.route} vs ${item.routeKey}`);
    if (!routeKeys.has(item.route)) errors.push(`navigation references missing ROUTES.${item.route}`);
    if (itemRouteKeys.has(item.routeKey)) errors.push(`duplicate navigation routeKey: ${item.routeKey}`);
    itemRouteKeys.add(item.routeKey);
  }
  for (const [, permission] of manifest.matchAll(/PERMISSIONS\.([A-Za-z0-9_]+)/g)) {
    if (!permissionKeys.has(permission)) errors.push(`navigation references missing PERMISSIONS.${permission}`);
  }

  const routePolicies = parseRoutePolicies(routeRegistry);
  for (const item of items) {
    const policy = routePolicies.get(item.route);
    if (!policy) continue;
    const actual = policy.kind === 'any' ? item.routeAny : item.routeAll;
    if (policy.permissions.join('|') !== actual.join('|')) {
      errors.push(`navigation/route permission drift for ROUTES.${item.route}`);
    }
  }

  const allowedConsoleFiles = new Set(['app/config/env.js', 'shared/utils/clientLogger.js']);
  for (const file of walk(SRC)) {
    const rel = path.relative(SRC, file).replaceAll('\\', '/');
    if (!/\.(?:js|jsx|mjs|cjs)$/.test(rel) || rel.startsWith('tests/') || rel.startsWith('quality/') || allowedConsoleFiles.has(rel)) continue;
    const source = fs.readFileSync(file, 'utf8');
    source.split(/\r?\n/).forEach((line, index) => {
      if (!line.trim().startsWith('//') && /\bconsole\.(?:log|warn|error|debug)\s*\(/.test(line)) {
        errors.push(`${rel}:${index + 1}: use clientLogger or user-facing error handling instead of raw console output`);
      }
    });
  }

  const budgets = {
    'features/reporting/pages/ForecastDetail.jsx': 3700,
    'features/reporting/pages/BudgetDetail.jsx': 2400,
    'features/reporting/pages/ProjectDetail.jsx': 2400,
    'features/reporting/pages/Allocations.jsx': 2300,
  };
  for (const [file, maxLines] of Object.entries(budgets)) {
    const count = read(file).split(/\r?\n/).length;
    if (count > maxLines) errors.push(`${file}: ${count} lines exceeds legacy page budget ${maxLines}`);
  }

  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = runArchitectureChecks();
  if (errors.length) {
    console.error(`Architecture gates failed (${errors.length}):`);
    errors.forEach((error) => console.error(` - ${error}`));
    process.exitCode = 1;
  } else {
    console.log('Architecture gates passed.');
  }
}
