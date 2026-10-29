import axiosInstance from '@services/request';
import { BASE_URL, POS_API_KEY } from '@utils/config';

export const DALA_API_URL = `${BASE_URL}/api/dala`;

export const getDalaHeaders = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      'x-pos-request': 'true',
      'x-pos-api-key': POS_API_KEY,
      'x-user-id': user?._id || user?.id || 'pos-system',
      'x-user-name': user?.name || user?.username || 'POS User',
      'x-user-email': user?.email || 'pos@system.local',
    };
  } catch {
    return {
      'x-pos-request': 'true',
      'x-pos-api-key': POS_API_KEY,
    };
  }
};

export { axiosInstance };
