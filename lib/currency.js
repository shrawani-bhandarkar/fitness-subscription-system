export const CURRENCY_CODE = "INR";
export const CURRENCY_MINOR_UNIT = "paise";

export function isNonNegativePaise(value) {
  return Number.isInteger(value) && value >= 0;
}

export function isPositivePaise(value) {
  return Number.isInteger(value) && value > 0;
}
