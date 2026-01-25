export function asArray(maybe) {
  if (!maybe) return []; 
  if (Array.isArray(maybe)) return maybe; 
  if (Array.isArray(maybe.items)) return maybe.items; 
  if (Array.isArray(maybe.data)) return maybe.data; 
  if (Array.isArray(maybe.rows)) return maybe.rows; 
  return []; 
}

export function toOptions(list, { valueKey = 'id', label = (x) => x?.name ?? x?.code ?? x?.id } = {}) {
  return asArray(list).map((x) => ({ value: String(x?.[valueKey] ?? ''), label: String(label(x) ?? '') })).filter((o)=>o.value); 
}

export const NONE_OPTION = { value: '', label: '— None —' }; 
