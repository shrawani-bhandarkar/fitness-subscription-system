export function parseRupeesToPaise(value) {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) {
    return null;
  }

  const [rupees, fraction = ""] = value.trim().split(".");
  const amount = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}
