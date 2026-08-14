export function parseAmountToCents(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 0n;
  const match = raw.match(/^([+-])?(\d+)(?:\.(\d{0,2}))?$/);
  if (!match) return null;
  const sign = match[1] === '-' ? -1n : 1n;
  const whole = BigInt(match[2]);
  const fraction = BigInt((match[3] || '').padEnd(2, '0'));
  return sign * (whole * 100n + fraction);
}

export function centsToDecimal(cents) {
  const value = BigInt(cents ?? 0n);
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

export function sumJournalLines(lines = []) {
  let debit = 0n;
  let credit = 0n;
  let valid = true;
  for (const line of lines) {
    const d = parseAmountToCents(line?.debit);
    const c = parseAmountToCents(line?.credit);
    if (d === null || c === null) {
      valid = false;
      continue;
    }
    debit += d;
    credit += c;
  }
  return { debit, credit, valid, balanced: valid && debit === credit };
}

export function allowedJournalActions(status, capabilities = {}) {
  const s = String(status || '').toLowerCase();
  const out = [];
  if (s === 'draft') {
    if (capabilities.submit) out.push('submit');
    if (capabilities.cancel) out.push('cancel');
  } else if (s === 'submitted') {
    if (capabilities.approve) out.push('approve');
    if (capabilities.reject) out.push('reject');
  } else if (s === 'approved') {
    if (capabilities.post) out.push('post');
  } else if (s === 'rejected') {
    if (capabilities.cancel) out.push('cancel');
  } else if (s === 'posted') {
    if (capabilities.void) out.push('void');
  }
  return out;
}
