import { parsePhoneNumber } from "libphonenumber-js";

export function getPhoneNumber(intPhoneNumber: any) {
  if (!intPhoneNumber || !intPhoneNumber.phone || !intPhoneNumber.code) {
    return "";
  }
  const phoneNumberObject = parsePhoneNumber(
    `${intPhoneNumber.code}${intPhoneNumber.phone}`,
    intPhoneNumber.short
  );
  return `${phoneNumberObject.number}`.replace("+", "");
}
