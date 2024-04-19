import { parsePhoneNumber } from 'libphonenumber-js';

export function getPhoneNumber(intPhoneNumber) {
    console.log("sfjbvsvbd", intPhoneNumber);
    
  const phoneNumberObject = parsePhoneNumber(
    `${intPhoneNumber.code}${intPhoneNumber.phone}`,
    intPhoneNumber.short,
  );
  return `${phoneNumberObject.number}`.replace('+', '');
}