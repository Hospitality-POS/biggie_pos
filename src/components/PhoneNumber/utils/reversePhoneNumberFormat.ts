import { parsePhoneNumber, parsePhoneNumberWithError, ParseError } from "libphonenumber-js";

/**
 * reversePhoneNumber
 * Used in AddProSupplierModal to pre-fill country/code/phone fields.
 * Guards against short, null, or malformed numbers to prevent TOO_SHORT crashes.
 */
export function reversePhoneNumber(phoneNumber: string | number | null | undefined): {
  short: string;
  code: string;
  phone: string;
} {
  const fallback = { short: "KE", code: "254", phone: "" };

  if (phoneNumber === null || phoneNumber === undefined) return fallback;

  const raw = String(phoneNumber).trim();
  const digits = raw.replace(/\D/g, "");

  // Guard: need at least 4 digits for libphonenumber to attempt parsing
  if (!raw || digits.length < 4) return fallback;

  try {
    // Prepend "+" if not already present so parsePhoneNumber gets a full E.164 number
    const normalized = raw.startsWith("+") ? raw : `+${digits}`;
    const parsed = parsePhoneNumber(normalized);
    return {
      short: parsed.country ?? "KE",
      code: String(parsed.countryCallingCode),
      phone: parsed.nationalNumber,
    };
  } catch (error) {
    if (error instanceof ParseError) {
      // TOO_SHORT, NOT_A_NUMBER, etc. — return fallback without crashing
      return fallback;
    }
    return fallback;
  }
}

/**
 * reversePhoneNumberBookings
 * Normalises a phone number to E.164 format for bookings/API calls.
 * Defaults to Kenya (+254) when no country prefix is recognisable.
 */
export const reversePhoneNumberBookings = (phoneNumber: string | null | undefined): string => {
  if (!phoneNumber || String(phoneNumber).trim() === "") return "";

  const raw = String(phoneNumber).trim();

  try {
    if (raw.startsWith("+")) return raw;

    const parsed = parsePhoneNumberWithError(raw, "KE");
    return parsed.format("E.164");
  } catch {
    try {
      const parsed = parsePhoneNumberWithError(raw);
      return parsed.format("E.164");
    } catch (secondError) {
      console.warn("Failed to parse phone number:", raw, secondError);
      const clean = raw.replace(/\D/g, "");
      if (clean.startsWith("0")) return `+254${clean.substring(1)}`;
      if (clean.startsWith("254")) return `+${clean}`;
      return `+254${clean}`;
    }
  }
};