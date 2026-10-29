export interface ModuleManifest {
  id: string;
  name: string;
  code: string;
  description: string;
  version: string;
  icon: string;
  requiredPlanTier?: 'starter' | 'growth' | 'pro' | 'enterprise';
  features: string[];
  routes: {
    path: string;
    label: string;
    exact?: boolean;
    adminOnly?: boolean;
    permission?: string;
  }[];
}

export const BanduManifest: ModuleManifest = {
  id: 'bandu',
  name: 'Bandu HR & Payroll',
  code: 'BANDU',
  description: 'Human Resources, Payroll Processing, Attendance, Shifts, Leaves & Payslips',
  version: '1.0.0',
  icon: 'TeamOutlined',
  requiredPlanTier: 'growth',
  features: [
    'Employee Management',
    'Payroll Processing (PAYE, NSSF, SHIF, Housing Levy)',
    'Payslip Generation & Email Distribution',
    'Attendance Tracking & Biometrics',
    'Shift Scheduling',
    'Leave Application & Policy Management',
    'Statutory Deductions & KRA P9 Forms',
    'HR & Payroll Analytics',
  ],
  routes: [
    { path: '/hr', label: 'HR Dashboard', permission: 'BANDU_DASHBOARD_VIEW' },
    { path: '/hr/employees', label: 'Employees', permission: 'BANDU_EMPLOYEES_VIEW' },
    { path: '/hr/payroll', label: 'Payroll', permission: 'BANDU_PAYROLL_VIEW' },
    { path: '/hr/payslips', label: 'Payslips', permission: 'BANDU_PAYSLIPS_VIEW' },
    { path: '/hr/attendance', label: 'Attendance', permission: 'BANDU_ATTENDANCE_VIEW' },
    { path: '/hr/shifts', label: 'Shifts', permission: 'BANDU_SHIFTS_VIEW' },
    { path: '/hr/leave', label: 'Leaves', permission: 'BANDU_LEAVES_VIEW' },
    { path: '/hr/deductions', label: 'Deductions & Statutory', permission: 'BANDU_DEDUCTIONS_VIEW' },
    { path: '/admin/hr', label: 'Admin HR Dashboard', adminOnly: true, permission: 'BANDU_DASHBOARD_VIEW' },
  ],
};

export default BanduManifest;
