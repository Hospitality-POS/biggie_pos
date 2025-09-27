import { parsePhoneNumber } from "libphonenumber-js";
import { parsePhoneNumberWithError } from 'libphonenumber-js';

export function reversePhoneNumber(phoneNumber: string) {
  const parsedPhoneNumber = parsePhoneNumber("+" + phoneNumber);
  return {
    short: parsedPhoneNumber.country,
    code: parsedPhoneNumber.countryCallingCode,
    phone: parsedPhoneNumber.nationalNumber,
  };
}


export const reversePhoneNumberBookings = (phoneNumber: string | null | undefined): string => {
  if (!phoneNumber || String(phoneNumber).trim() === '') {
    return '';
  }

  const raw = String(phoneNumber).trim();

  try {
    if (raw.startsWith('+')) {
      return raw;
    }

    const parsed = parsePhoneNumberWithError(raw, 'KE');
    return parsed.format('E.164');
  } catch {
    try {
      const parsed = parsePhoneNumberWithError(raw);
      return parsed.format('E.164');
    } catch (secondError) {
      console.warn('Failed to parse phone number:', raw, secondError);
      const cleanNumber = raw.replace(/\D/g, '');
      if (cleanNumber.startsWith('0')) {
        return `+254${cleanNumber.substring(1)}`;
      } else if (cleanNumber.startsWith('254')) {
        return `+${cleanNumber}`;
      } else {
        return `+254${cleanNumber}`;
      }
    }
  }
};