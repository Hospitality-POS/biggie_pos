/**
 * Whoever a form or plan is for: a customer (customer_name / company_name) or
 * a Bandu employee (fullname or first / last name).
 */
export interface PersonLite {
  _id: string;
  customer_name?: string;
  company_name?: string;
  fullname?: string;
  firstname?: string;
  middle_name?: string;
  lastname?: string;
  name?: string;
  phone?: string | number;
  job_title?: string;
}

export const personName = (p?: PersonLite | null) =>
  p?.name ||
  p?.customer_name ||
  p?.company_name ||
  p?.fullname ||
  [p?.firstname, p?.middle_name, p?.lastname].filter(Boolean).join(" ") ||
  "";
