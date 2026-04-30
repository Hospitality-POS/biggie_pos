export interface User {
  fullname: string;
  username: string;
  email: string;
  pin: string;
  phone: string;
  idNumber: string;
  isAdmin: string;
  role: any,
  roleId: string;
  preferredAuthMethod?: 'pin' | 'password' | '2fa' | 'otp';
}
