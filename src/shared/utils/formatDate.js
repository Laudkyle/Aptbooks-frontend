export function formatDate(value) {
  if (!value) return ''; 
  try {
    const d = new Date(value); 
    if (Number.isNaN(d.getTime())) return String(value); 
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }); 
  } catch {
    return String(value); 
  }
}
