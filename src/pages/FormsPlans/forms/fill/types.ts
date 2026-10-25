import type { Answers } from "../components/FormRenderer";
import type { FormCategory, FormSection, FormSigner, SignerRole } from "../types";

export type SubmissionStatus = "pending" | "in_progress" | "awaiting_therapist" | "completed" | "voided";

export interface SignatureInput {
  signer_name: string;
  /** "saved" = the person's signature kept from an earlier form */
  method: "draw" | "type" | "saved";
  /** PNG data URL when drawn */
  data?: string;
  typed_name?: string;
  /** The person: keep (true) or forget (false) this signature for next time */
  save_for_later?: boolean;
}

/** A signature that can be reused: the person's kept one, or a staff library item. */
export interface SavedSignatureOption {
  id: string;
  label: string;
  method: "draw" | "type";
  /** PNG data URL (drawn signatures) */
  data?: string | null;
  typed_name?: string;
  signer_name: string;
}

export interface SubmissionSignature {
  role: SignerRole;
  signer_name: string;
  method: "draw" | "type";
  typed_name?: string;
  signed_at: string;
}

export interface SubmissionAlert {
  field_key: string;
  question: string;
  answer: string;
}

export interface CustomerAlert extends SubmissionAlert {
  form_name: string;
  reported_at: string;
  submission_id: string;
}

export interface FrozenForm {
  name: string;
  category?: FormCategory;
  description?: string;
  sections: FormSection[];
  signers: FormSigner[];
  declaration?: string;
}

export interface FormSubmission {
  _id: string;
  subject_type: "customer" | "employee";
  customer_id: string | null;
  employee_id: string | null;
  subject_snapshot: { name: string; phone: string; email: string };
  template_id: string;
  template_version: number;
  form: FrozenForm;
  channel: "in_store" | "link";
  status: SubmissionStatus;
  answers: Answers;
  alerts: SubmissionAlert[];
  signatures: SubmissionSignature[];
  public_link?: { expires_at?: string | null; revoked?: boolean; last_opened_at?: string | null };
  has_pdf: boolean;
  client_signed_at?: string | null;
  completed_at?: string | null;
  void_reason?: string;
  createdAt: string;
  updatedAt: string;
}

export type FormSubmissionSummary = Omit<FormSubmission, "answers" | "form"> & {
  form: Pick<FrozenForm, "name" | "category" | "signers">;
};

export interface PublicFormView {
  business_name: string;
  audience: "client" | "employee";
  client_name: string;
  status: SubmissionStatus;
  signed: boolean;
  expires_at: string;
  form: Partial<FrozenForm> & { name: string };
  answers: Answers;
  has_pdf: boolean;
}

export const SUBMISSION_STATUS_META: Record<SubmissionStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Not started", color: "#64748b", bg: "#f1f5f9" },
  in_progress: { label: "Filling in", color: "#2563eb", bg: "#eff6ff" },
  awaiting_therapist: { label: "Needs countersign", color: "#d97706", bg: "#fffbeb" },
  completed: { label: "Signed", color: "#059669", bg: "#ecfdf5" },
  voided: { label: "Voided", color: "#94a3b8", bg: "#f8fafc" },
};
