/**
 * Whoever a form or plan is for: a customer (customer_name / company_name),
 * a Bandu employee (fullname or first / last name) or a Mteja lead
 * (lead_name / contact_person / company_name).
 */
export interface PersonLite {
  _id: string;
  customer_name?: string;
  company_name?: string;
  fullname?: string;
  firstname?: string;
  middle_name?: string;
  lastname?: string;
  lead_name?: string;
  contact_person?: string;
  name?: string;
  phone?: string | number;
  email?: string;
  job_title?: string;
}

export const personName = (p?: PersonLite | null) =>
  p?.name ||
  p?.customer_name ||
  p?.lead_name ||
  p?.contact_person ||
  p?.company_name ||
  p?.fullname ||
  [p?.firstname, p?.middle_name, p?.lastname].filter(Boolean).join(" ") ||
  "";
