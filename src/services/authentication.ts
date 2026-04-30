import axiosInstance from './request';
import { updateAuthMethodStatus } from '../utils/authStorage';
import { updateUsers } from './users';

export interface AuthMethodResponse {
  currentMethod: 'pin' | 'password' | '2fa';
  hasPassword: boolean;
  has2FA: boolean;
  email?: string;
}

export interface PasswordSetupRequest {
  userId: string;
  password: string;
  preferredAuthMethod?: 'pin' | 'password' | '2fa' | 'otp';
}

export interface TwoFASetupResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface TwoFAVerifyRequest {
  userId: string;
  token: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  email: string;
  newPassword: string;
}

export interface LoginRequest {
  method?: 'password' | '2fa' | 'otp';
  email?: string;
  credential: string; // PIN, password, TOTP code, or OTP code
}

export interface OtpSendRequest {
  email: string;
}

export interface OtpVerifyRequest {
  email: string;
  code: string;
}

export interface OtpEnableRequest {
  userId: string;
}

export interface OtpDisableRequest {
  userId: string;
}

// Helper function to get company code for headers
const getAuthHeaders = () => {
  const companyCode = localStorage.getItem('companyCode');
  return companyCode ? { companyCode } : {};
};

// Authentication method management
export const getAuthMethods = async (userId: string): Promise<AuthMethodResponse> => {
  const response = await axiosInstance.get(`/auth/methods/${userId}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

// Password management - using user update endpoint
export const enablePassword = async (data: PasswordSetupRequest): Promise<void> => {
  await updateUsers({
    _id: data.userId,
    value: {
      password: data.password,
      passwordEnabled: true,
      preferredAuthMethod: data.preferredAuthMethod || 'password'
    }
  });
  
  // Update localStorage with new password authentication data
  updateAuthMethodStatus('password', true, {
    password: data.password,
    userId: data.userId
  });
};

export const disablePassword = async (userId: string, preferredAuthMethod?: 'pin' | 'password' | '2fa' | 'otp'): Promise<void> => {
  await updateUsers({
    _id: userId,
    value: {
      passwordEnabled: false,
      preferredAuthMethod: preferredAuthMethod || 'pin'
    }
  });
  
  // Update localStorage to reflect password being disabled
  updateAuthMethodStatus('password', false);
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
  await axiosInstance.post('/auth/password/change', {
    userId,
    currentPassword,
    newPassword
  }, { headers: getAuthHeaders() });
};

export const requestPasswordReset = async (data: PasswordResetRequest): Promise<void> => {
  await axiosInstance.post('/auth/password/reset-request', data, { headers: getAuthHeaders() });
};

export const confirmPasswordReset = async (data: PasswordResetConfirm): Promise<void> => {
  await axiosInstance.post('/auth/password/reset-confirm', data, { headers: getAuthHeaders() });
};

// 2FA management - using user update endpoint
export const setup2FA = async (userId: string, preferredAuthMethod?: 'pin' | 'password' | '2fa' | 'otp'): Promise<TwoFASetupResponse> => {
  const response = await axiosInstance.post('/auth/2fa/setup', { userId }, { headers: getAuthHeaders() });
  
  return response.data;
};

export const verify2FASetup = async (data: TwoFAVerifyRequest, preferredAuthMethod?: 'pin' | 'password' | '2fa' | 'otp'): Promise<void> => {
  const response = await axiosInstance.post('/auth/2fa/verify-setup', data, { headers: getAuthHeaders() });
  
  // Note: User update and localStorage update will be handled by the parent component after onEnable callback
};

export const disable2FA = async (userId: string, preferredAuthMethod?: 'pin' | 'password' | '2fa' | 'otp'): Promise<void> => {
  await updateUsers({
    _id: userId,
    value: {
      twoFactorEnabled: false,
      preferredAuthMethod: preferredAuthMethod || 'pin'
    }
  });
  
  // Update localStorage to reflect 2FA being disabled
  updateAuthMethodStatus('2fa', false);
};

export const regenerate2FACodes = async (userId: string): Promise<string[]> => {
  const response = await axiosInstance.post('/auth/2fa/regenerate-codes', { userId }, { headers: getAuthHeaders() });
  return response.data.backupCodes;
};

export const adminReset2FA = async (userId: string): Promise<void> => {
  await axiosInstance.post('/auth/2fa/admin-reset', { userId }, { headers: getAuthHeaders() });
};

// OTP Management - using user update endpoint
export const sendOtp = async (data: OtpSendRequest): Promise<{ message: string; expiresIn: number }> => {
  const response = await axiosInstance.post('/auth/otp/send', data, { headers: getAuthHeaders() });
  return response.data;
};

export const verifyOtp = async (data: OtpVerifyRequest): Promise<{ message: string; valid: boolean }> => {
  const response = await axiosInstance.post('/auth/otp/verify', data, { headers: getAuthHeaders() });
  return response.data;
};

export const enableOtp = async (data: OtpEnableRequest, preferredAuthMethod?: 'pin' | 'password' | '2fa' | 'otp'): Promise<{ message: string }> => {
  await updateUsers({
    _id: data.userId,
    value: {
      otpEnabled: true,
      preferredAuthMethod: preferredAuthMethod || 'otp'
    }
  });
  
  return { message: 'OTP authentication enabled successfully' };
};

export const disableOtp = async (data: OtpDisableRequest, preferredAuthMethod?: 'pin' | 'password' | '2fa' | 'otp'): Promise<{ message: string }> => {
  await updateUsers({
    _id: data.userId,
    value: {
      otpEnabled: false,
      preferredAuthMethod: preferredAuthMethod || 'pin'
    }
  });
  
  return { message: 'OTP authentication disabled successfully' };
};

export const resetOtpAttempts = async (userId: string): Promise<{ message: string }> => {
  const response = await axiosInstance.post('/auth/otp/reset-attempts', { userId }, { headers: getAuthHeaders() });
  return response.data;
};

export const validateOtpCredentials = async (data: OtpVerifyRequest): Promise<{ valid: boolean; user?: any }> => {
  const response = await axiosInstance.post('/auth/otp/validate', data, { headers: getAuthHeaders() });
  return response.data;
};

// Enhanced login
export const loginWithMethod = async (data: LoginRequest) => {
  const response = await axiosInstance.post('/users/login', data, { headers: getAuthHeaders() });
  return response.data;
};
