import axiosInstance from '@services/request';

// The shared client: it adds the signed-in session, company code and branch to
// every request, and handles sign-out and permission checks.
export { axiosInstance };
export default axiosInstance;
