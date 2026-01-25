import { readEnv } from '../config/env.js';
import { readRuntimeConfig } from './runtime-config.js';
import { authStore } from '../store/auth.store.js';
import { orgStore } from '../store/org.store.js';

export function bootstrap() {
  const env = readEnv();
  const runtime = readRuntimeConfig();
  const config = { ...env, ...runtime };

  // Hydrate persisted stores
  authStore.getState().hydrate();
  orgStore.getState().hydrate();

  return config;
}
