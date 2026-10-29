export interface Employee {
  _id: string;
  employee_number: string;
  user_id?: {
    _id: string;
    fullname: string;
    username: string;
    email: string;
    phone?: string;
    thumbnail?: string;
  } | null;
  fullname?: string;
  firstname?: string;
  middle_name?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  id_number?: string;
  department_id?: {
    _id: string;
    name: string;
    code: string;
  } | null;
  shop_id?: {
    _id: string;
    name: string;
  };
  hire_date: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern' | 'casual' | 'consultant';
  employee_type?: 'primary' | 'secondary';
  is_pwd?: boolean;
  pwd_certificate_number?: string;
  job_title: string;
  employment_status: 'active' | 'on_leave' | 'suspended' | 'terminated' | 'resigned';
  termination_date?: string;
  termination_reason?: string;
  suspension_start_date?: string;
  suspension_end_date?: string;
  suspension_reason?: string;
  basic_salary: number;
  salary_type?: 'gross' | 'net';
  currency: string;
  payment_frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  hourly_rate?: number;
  allowances: Array<{
    name: string;
    amount: number;
    frequency: string;
    is_taxable: boolean;
  }>;
  benefits: Array<{
    name: string;
    amount: number;
    frequency: string;
    is_taxable: boolean;
  }>;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  residential_status?: 'resident' | 'non_resident';
  kra_pin?: string;
  nssf_number?: string;
  nhif_number?: string;
  helb_amount?: number;
  pension_contribution?: number;
  has_insurance_policy?: boolean;
  insurance_policy?: {
    provider?: string;
    policy_number?: string;
    start_date?: string;
    contribution_amount?: number;
    frequency?: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  };
  exempt_deductions?: string[];
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  nationality?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  notes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateEmployeeParams {
  user_id?: string;
  fullname?: string;
  firstname?: string;
  middle_name?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  id_number?: string;
  department_id?: string;
  shop_id?: string;
  hire_date: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'intern' | 'casual' | 'consultant';
  employee_type?: 'primary' | 'secondary';
  is_pwd?: boolean;
  pwd_certificate_number?: string;
  job_title: string;
  basic_salary: number;
  salary_type?: 'gross' | 'net';
  currency: string;
  payment_frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  hourly_rate?: number;
  allowances?: Array<{
    name: string;
    amount: number;
    frequency: string;
    is_taxable: boolean;
  }>;
  benefits?: Array<{
    name: string;
    amount: number;
    frequency: string;
    is_taxable: boolean;
  }>;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  residential_status?: 'resident' | 'non_resident';
  kra_pin?: string;
  nssf_number?: string;
  nhif_number?: string;
  helb_amount?: number;
  pension_contribution?: number;
  has_insurance_policy?: boolean;
  insurance_policy?: {
    provider?: string;
    policy_number?: string;
    start_date?: string;
    contribution_amount?: number;
    frequency?: 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  };
  exempt_deductions?: string[];
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  nationality?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  notes?: string;
}

export interface EmployeeImportResult {
  success: boolean;
  total_records: number;
  created_records: number;
  updated_records: number;
  failed_records: number;
  errors?: Array<{ row: number; employee: string; message: string }>;
}

export interface EmployeeAnalysisResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicates: number;
  preview: any[];
}

export interface EmployeeDocument {
  _id: string;
  employee_id: string;
  document_type: string;
  document_name: string;
  document_url: string;
  file_size?: number;
  expiry_date?: string;
  uploaded_at: string;
}

export interface LeavePolicy {
  _id: string;
  name: string;
  code: string;
  description?: string;
  department_id?: { _id: string; name: string } | null;
  annual_days: number;
  sick_days: number;
  maternity_days: number;
  paternity_days: number;
  compassionate_days: number;
  carryover_days_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLeavePolicyParams {
  name: string;
  code: string;
  description?: string;
  department_id?: string;
  annual_days: number;
  sick_days: number;
  maternity_days: number;
  paternity_days: number;
  compassionate_days: number;
  carryover_days_limit: number;
}

export interface Leave {
  _id: string;
  employee_id: {
    _id: string;
    employee_number: string;
    fullname?: string;
    user_id?: { fullname?: string; email?: string };
    job_title: string;
  };
  leave_type: 'Annual' | 'Sick' | 'Emergency' | 'Maternity' | 'Paternity' | 'Unpaid' | 'Compassionate';
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: { _id: string; fullname: string };
  rejection_reason?: string;
  documents?: Array<{ _id: string; name: string; url: string }>;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  employee_id: string;
  annual_leave_days: number;
  sick_leave_days: number;
  maternity_leave_days: number;
  paternity_leave_days: number;
  compassionate_leave_days: number;
  remaining_annual_days: number;
  remaining_sick_days: number;
}

export interface CreateLeaveParams {
  employee_id?: string;
  leave_type: 'Annual' | 'Sick' | 'Emergency' | 'Maternity' | 'Paternity' | 'Unpaid' | 'Compassionate';
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface Payroll {
  _id: string;
  period_start: string;
  period_end: string;
  period_label: string;
  payment_date: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'processed' | 'paid' | 'voided';
  total_gross: number;
  total_deductions: number;
  total_net: number;
  employee_count: number;
  lines?: any[];
  created_at: string;
  updated_at: string;
}

export interface GeneratePayrollParams {
  period_start: string;
  period_end: string;
  payment_date: string;
  period_label?: string;
  department_id?: string;
  shop_id?: string;
  employee_ids?: string[];
}

export interface PayrollPreviewLine {
  employee_id: string;
  employee_number: string;
  employee_name: string;
  job_title: string;
  basic_salary: number;
  allowances: number;
  gross_pay: number;
  paye: number;
  nssf: number;
  nhif: number;
  housing_levy: number;
  total_deductions: number;
  net_pay: number;
}

export interface PayrollPreviewResult {
  period_start: string;
  period_end: string;
  lines: PayrollPreviewLine[];
  summary: {
    total_employees: number;
    total_gross: number;
    total_paye: number;
    total_nssf: number;
    total_nhif: number;
    total_housing_levy: number;
    total_deductions: number;
    total_net: number;
  };
}

export interface Payslip {
  _id: string;
  payroll_id: string;
  employee_id: {
    _id: string;
    employee_number: string;
    fullname?: string;
    user_id?: { fullname?: string; email?: string };
    job_title: string;
    employment_type?: string;
  };
  period_start: string;
  period_end: string;
  period_label: string;
  earnings: {
    basic_salary: number;
    allowances: number;
    benefits: number;
    allowance_items?: Array<{ name: string; amount: number }>;
    benefit_items?: Array<{ name: string; value: number }>;
    overtime_pay: number;
    gross_salary: number;
  };
  deductions: {
    paye: number;
    nssf: number;
    nhif: number;
    housing_levy: number;
    nita?: number;
    withholding_tax?: number;
    taxable_pay?: number;
    income_tax?: number;
    personal_relief?: number;
    pension?: number;
    insurance_relief?: number;
    custom: Array<{ name: string; amount: number }>;
    total: number;
  };
  net_pay: number;
  days_worked: number;
  overtime_hours: number;
  generated_at: string;
  emailed_at?: string | null;
  email_to?: string | null;
}

export interface P9Form {
  _id: string;
  employee_id: {
    _id: string;
    employee_number: string;
    fullname: string;
    kra_pin?: string;
  };
  year: number;
  basic_salary: number;
  benefits: number;
  total_gross: number;
  paye: number;
  nssf: number;
  nhif: number;
  housing_levy: number;
  taxable_pay: number;
  generated_at: string;
}

export interface Shift {
  _id?: string;
  employee_id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface EmployeeStats {
  total_employees: number;
  active_employees: number;
  on_leave: number;
  suspended: number;
  terminated: number;
  resigned: number;
  new_hires_this_month: number;
}

export interface LeaveStats {
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  on_leave_today: number;
}

export interface AttendanceStats {
  present_today: number;
  absent_today: number;
  late_today: number;
  average_attendance_rate: number;
}

export interface PayrollStats {
  total_payroll_this_month: number;
  total_deductions: number;
  net_pay: number;
  pending_payroll: number;
}

export interface PayrollTrendMonth {
  label: string;
  gross_pay: number;
  deductions: number;
  net_pay: number;
}

export interface LeaveByType {
  leave_type: string;
  count: number;
  approved: number;
  pending: number;
}

export interface EmployeeByDepartment {
  department: string;
  count: number;
  active: number;
  on_leave: number;
}

export interface HRDashboardData {
  employeeStats: EmployeeStats;
  leaveStats: LeaveStats;
  attendanceStats: AttendanceStats;
  payrollStats: PayrollStats;
  payrollTrends: PayrollTrendMonth[];
  leaveDistribution: LeaveByType[];
  departmentDistribution: EmployeeByDepartment[];
}
