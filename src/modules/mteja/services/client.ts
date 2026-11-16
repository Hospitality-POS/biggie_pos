import axiosInstance from '@services/request';
import { BASE_URL } from '@utils/config';

export const CRM_API_URL = `${BASE_URL}/crm`;
export const OMNICHANNEL_API_URL = `${BASE_URL}/omnichannel`;

export const getMtejaHeaders = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    return {
      Authorization: token ? `Bearer ${token}` : '',
      'x-user-id': user?._id || user?.id || '',
    };
  } catch {
    return {};
  }
};

export { axiosInstance };
