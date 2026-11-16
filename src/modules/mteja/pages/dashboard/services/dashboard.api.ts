import { axiosInstance, CRM_API_URL, OMNICHANNEL_API_URL } from '../../../services/client';

export const fetchMtejaDashboardStats = async (params: { shop_id?: string; startDate?: string; endDate?: string } = {}) => {
  try {
    const [crmRes, omniRes] = await Promise.allSettled([
      axiosInstance.get(`${CRM_API_URL}/dashboard/stats`, { params }),
      axiosInstance.get(`${OMNICHANNEL_API_URL}/stats`, { params }),
    ]);

    const crmData = crmRes.status === 'fulfilled' ? crmRes.value.data?.data || crmRes.value.data : {};
    const omniData = omniRes.status === 'fulfilled' ? omniRes.value.data?.data || omniRes.value.data : {};

    return {
      ...crmData,
      ...omniData,
    };
  } catch (error) {
    console.error('Failed to fetch Mteja dashboard stats:', error);
    return null;
  }
};
