import { axiosInstance } from '../../../services/client';
import { BASE_URL, shareableOrigin } from '@utils/config';
import type { PublicLinkInfo } from '../../../types';

export const createPublicLink = async (
  documentId: string
): Promise<{ token: string; expires_at: string }> => {
  const response = await axiosInstance.post(
    `${BASE_URL}/documents/${documentId}/signing/public-link`
  );
  return response.data;
};

export const getPublicLink = async (documentId: string): Promise<PublicLinkInfo> => {
  const response = await axiosInstance.get(
    `${BASE_URL}/documents/${documentId}/signing/public-link`
  );
  return response.data;
};

export const revokePublicLink = async (documentId: string): Promise<any> => {
  const response = await axiosInstance.delete(
    `${BASE_URL}/documents/${documentId}/signing/public-link`
  );
  return response.data;
};

export const buildPublicSignUrl = (token: string): string => {
  const companyCode = localStorage.getItem('companyCode') || '';
  return `${shareableOrigin()}/esign/sign/${token}?c=${encodeURIComponent(companyCode)}`;
};
