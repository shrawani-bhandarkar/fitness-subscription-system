export function parseMemberProfile({ name, phone, address }) {
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
  const normalizedAddress = typeof address === "string" ? address.trim() : "";
  const phoneDigits = normalizedPhone.replace(/\D/g, "");

  if (normalizedName.length < 2 || normalizedName.length > 80) {
    return null;
  }
  if (normalizedAddress.length > 500) {
    return null;
  }
  if (
    normalizedPhone.length > 32 ||
    (normalizedPhone &&
      (!/^[+()\d.\-\s]+$/.test(normalizedPhone) ||
        phoneDigits.length < 7 ||
        phoneDigits.length > 15))
  ) {
    return null;
  }

  return {
    name: normalizedName,
    phone: normalizedPhone,
    address: normalizedAddress,
  };
}
