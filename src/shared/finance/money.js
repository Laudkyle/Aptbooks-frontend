import {
  FINANCIAL_SCALE,
  formatScaledInteger,
  scaledIntegerToNumber,
  toScaledInteger,
} from './fixedPoint.js';

export function moneyUnits(value) {
  return toScaledInteger(value ?? '0', FINANCIAL_SCALE.money);
}

export function moneyString(value) {
  return formatScaledInteger(moneyUnits(value), FINANCIAL_SCALE.money);
}

export function moneyStringFromUnits(units) {
  return formatScaledInteger(units, FINANCIAL_SCALE.money);
}

// Presentation boundary only. Never use the returned Number for financial decisions.
export function moneyNumber(value) {
  return scaledIntegerToNumber(moneyUnits(value), FINANCIAL_SCALE.money);
}

export function moneyNumberFromUnits(units) {
  return scaledIntegerToNumber(units, FINANCIAL_SCALE.money);
}

export function sumMoneyUnits(values) {
  return values.reduce((sum, value) => sum + moneyUnits(value), 0n);
}
