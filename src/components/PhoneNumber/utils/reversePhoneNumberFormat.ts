import { parsePhoneNumber } from "libphonenumber-js";

export function reversePhoneNumber(phoneNumber) {
  const parsedPhoneNumber = parsePhoneNumber("+" + phoneNumber);
  return {
    short: parsedPhoneNumber.country,
    code: parsedPhoneNumber.countryCallingCode,
    phone: parsedPhoneNumber.nationalNumber,
  };
}