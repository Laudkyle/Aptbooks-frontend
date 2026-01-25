import { z } from 'zod'; 

const EnvSchema = z.object({
  VITE_API_URL: z.string().min(1),
  VITE_APP_NAME: z.string().optional(),
  VITE_COOKIE_REFRESH_MODE: z.string().optional(),
  VITE_LOG_LEVEL: z.string().optional()
}); 

export function readEnv() {
  const parsed = EnvSchema.safeParse(import.meta.env); 
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment variables', parsed.error.flatten()); 
    throw new Error('Invalid environment variables. Check .env'); 
  }
  const e = parsed.data; 
  return {
    apiUrl: e.VITE_API_URL,
    appName: e.VITE_APP_NAME ?? 'AptBooks',
    cookieRefreshMode: (e.VITE_COOKIE_REFRESH_MODE ?? 'false') === 'true',
    logLevel: e.VITE_LOG_LEVEL ?? 'info'
  }; 
}
