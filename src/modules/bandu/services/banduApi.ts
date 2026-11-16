export * from './client';
export * from '../pages/dashboard/services';
export * from '../pages/employees/services';
export * from '../pages/payroll/services';
export * from '../pages/payslips/services';
export * from '../pages/attendance/services';
export * from '../pages/shifts/services';
export * from '../pages/leave/services';
export * from '../pages/deductions/services';
export * from '../pages/reports/services';

import * as dashboardApi from '../pages/dashboard/services';
import * as employeesApi from '../pages/employees/services';
import * as payrollApi from '../pages/payroll/services';
import * as payslipsApi from '../pages/payslips/services';
import * as attendanceApi from '../pages/attendance/services';
import * as shiftsApi from '../pages/shifts/services';
import * as leaveApi from '../pages/leave/services';
import * as deductionsApi from '../pages/deductions/services';
import * as reportsApi from '../pages/reports/services';

const banduApi = {
  ...dashboardApi,
  ...employeesApi,
  ...payrollApi,
  ...payslipsApi,
  ...attendanceApi,
  ...shiftsApi,
  ...leaveApi,
  ...deductionsApi,
  ...reportsApi,
};

export default banduApi;
