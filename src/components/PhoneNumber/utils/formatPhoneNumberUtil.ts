import { parsePhoneNumber } from "libphonenumber-js";

export function getPhoneNumber(intPhoneNumber: any) {
  const phoneNumberObject = parsePhoneNumber(
    `${intPhoneNumber.code}${intPhoneNumber.phone}`,
    intPhoneNumber.short
  );
  return `${phoneNumberObject.number}`.replace("+", "");
}
