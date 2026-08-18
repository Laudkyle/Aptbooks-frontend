const POW10 = new Map([[0, 1n]]);

function pow10(scale) {
  if (!Number.isInteger(scale) || scale < 0 || scale > 18) throw new Error('Invalid fixed-point scale');
  if (!POW10.has(scale)) POW10.set(scale, 10n ** BigInt(scale));
  return POW10.get(scale);
}

function expandScientific(value) {
  const raw = String(value).trim();
  if (!/[eE]/.test(raw)) return raw;
  const match = raw.match(/^([+-]?)(\d+)(?:\.(\d*))?[eE]([+-]?\d+)$/);
  if (!match) throw new Error('Invalid decimal format');
  const [, sign, whole, fraction = '', exponentRaw] = match;
  const exponent = Number(exponentRaw);
  if (!Number.isInteger(exponent)) throw new Error('Invalid decimal exponent');
  const digits = `${whole}${fraction}`;
  const decimalIndex = whole.length + exponent;
  if (decimalIndex <= 0) return `${sign}0.${'0'.repeat(-decimalIndex)}${digits}`;
  if (decimalIndex >= digits.length) return `${sign}${digits}${'0'.repeat(decimalIndex - digits.length)}`;
  return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}

export function decimalString(value, fallback = '0') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number' && !Number.isFinite(value)) return fallback;
  const raw = expandScientific(value);
  if (!/^[+-]?(?:\d+)(?:\.\d+)?$/.test(raw)) return fallback;
  return raw;
}

/** Parse to a scaled BigInt using round-half-up (away from zero at exact halves). */
export function toScaledInteger(value, scale = 2, fallback = '0') {
  const raw = decimalString(value, fallback);
  const match = raw.match(/^([+-])?(\d+)(?:\.(\d+))?$/);
  if (!match) throw new Error('Invalid decimal format');
  const negative = match[1] === '-';
  const whole = match[2];
  const fraction = match[3] || '';
  const kept = fraction.slice(0, scale).padEnd(scale, '0');
  let units = BigInt(`${whole}${kept}` || '0');
  const discarded = fraction.slice(scale);
  if (discarded && discarded[0] >= '5') units += 1n;
  return negative ? -units : units;
}

export function divideRoundHalfUp(numerator, denominator) {
  if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint' || denominator <= 0n) {
    throw new Error('divideRoundHalfUp expects BigInt numerator and positive denominator');
  }
  if (numerator === 0n) return 0n;
  const negative = numerator < 0n;
  const absolute = negative ? -numerator : numerator;
  const quotient = absolute / denominator;
  const remainder = absolute % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return negative ? -rounded : rounded;
}

export function formatScaledInteger(units, scale = 2) {
  if (typeof units !== 'bigint') throw new Error('Expected BigInt units');
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  if (scale === 0) return `${negative ? '-' : ''}${absolute}`;
  const base = pow10(scale);
  const whole = absolute / base;
  const fraction = String(absolute % base).padStart(scale, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

export function scaledIntegerToNumber(units, scale = 2) {
  return Number(formatScaledInteger(units, scale));
}

export function multiplyScaled(left, leftScale, right, rightScale, outputScale) {
  const leftUnits = toScaledInteger(left, leftScale);
  const rightUnits = toScaledInteger(right, rightScale);
  const productScale = leftScale + rightScale;
  if (productScale === outputScale) return leftUnits * rightUnits;
  if (productScale < outputScale) return leftUnits * rightUnits * pow10(outputScale - productScale);
  return divideRoundHalfUp(leftUnits * rightUnits, pow10(productScale - outputScale));
}

export const FINANCIAL_SCALE = Object.freeze({
  money: 2,
  documentQuantity: 4,
  documentUnitPrice: 2,
  quantity: 6,
  unitPrice: 6,
  unitCost: 6,
  percentagePoints: 6,
  fraction: 6,
  exchangeRate: 6,
});

export function percentagePointsToMicros(value) {
  const units = toScaledInteger(value, FINANCIAL_SCALE.percentagePoints);
  if (units < 0n) throw new Error('Percentage rate cannot be negative');
  return units;
}

export function applyPercentagePointUnits(amountUnits, rateMicros) {
  if (typeof amountUnits !== 'bigint' || typeof rateMicros !== 'bigint') {
    throw new Error('amountUnits and rateMicros must be BigInt values');
  }
  if (rateMicros < 0n) throw new Error('Percentage rate cannot be negative');
  const denominator = 100n * pow10(FINANCIAL_SCALE.percentagePoints);
  return divideRoundHalfUp(amountUnits * rateMicros, denominator);
}

export function applyPercentagePoints(amountUnits, rate) {
  return applyPercentagePointUnits(amountUnits, percentagePointsToMicros(rate));
}

export function inclusiveTaxBreakdown(grossUnits, rate) {
  const rateMicros = percentagePointsToMicros(rate);
  if (rateMicros === 0n) return { baseUnits: grossUnits, taxUnits: 0n };
  const hundred = 100n * pow10(FINANCIAL_SCALE.percentagePoints);
  const baseUnits = divideRoundHalfUp(grossUnits * hundred, hundred + rateMicros);
  return { baseUnits, taxUnits: grossUnits - baseUnits };
}

export function clampPercentagePoints(value, min = 0, max = 100) {
  const units = percentagePointsToMicros(value);
  const minUnits = percentagePointsToMicros(min);
  const maxUnits = percentagePointsToMicros(max);
  if (units < minUnits) return minUnits;
  if (units > maxUnits) return maxUnits;
  return units;
}

export function percentagePointsToFractionNumber(value) {
  const units = clampPercentagePoints(value, 0, 100);
  const denominator = 100n * pow10(FINANCIAL_SCALE.percentagePoints);
  return Number(units) / Number(denominator);
}

export function fractionToPercentagePointsNumber(value, fallback = 100) {
  const units = toScaledInteger(value, FINANCIAL_SCALE.fraction, String(fallback / 100));
  const denominator = pow10(FINANCIAL_SCALE.fraction);
  const clamped = units < 0n ? 0n : units > denominator ? denominator : units;
  return Number(clamped * 1000000n * 100n / denominator) / 1000000;
}

export function normalizePercentagePointsNumber(value, fallback = 0) {
  try {
    const units = percentagePointsToMicros(value === '' || value == null ? fallback : value);
    return scaledIntegerToNumber(units, FINANCIAL_SCALE.percentagePoints);
  } catch (_) {
    const fallbackUnits = percentagePointsToMicros(fallback);
    return scaledIntegerToNumber(fallbackUnits, FINANCIAL_SCALE.percentagePoints);
  }
}
