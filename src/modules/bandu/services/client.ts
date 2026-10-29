import axiosInstance from '@services/request';
import { BASE_URL } from '@utils/config';

export const BANDU_API_URL = `${BASE_URL}/bandu`;

export const getBanduHeaders = () => {
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
