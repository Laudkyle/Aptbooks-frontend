export function generateRequestId() {
  if (crypto?.randomUUID) return crypto.randomUUID(); 
  // fallback
  return `rid_${Math.random().toString(16).slice(2)}_${Date.now()}`; 
}
