// Optional runtime config hook. If you host with a runtime-injected window.__RUNTIME_CONFIG__
// this will merge it over build-time env.
export function readRuntimeConfig() {
  const cfg = window.__RUNTIME_CONFIG__;
  if (!cfg || typeof cfg !== 'object') return {};
  return cfg;
}
