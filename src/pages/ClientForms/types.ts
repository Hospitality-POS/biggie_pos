export type FormStatus = "draft" | "pending_approval" | "approved" | "archived";

export type FormCategory =
  | "consultation"
  | "facial"
  | "lash_brow"
  | "massage"
  | "reflexology"
  | "wood_therapy"
  | "chemical_peel"
  | "iv_drip"
  | "skin_tag"
  | "other";

export type FieldType =
  | "short_text"
  | "long_text"
  | "date"
  | "phone"
  | "email"
  | "number"
  | "yes_no"
  | "single_choice"
  | "multi_choice"
  | "rating"
  | "consent"
  | "initials"
  | "signature"
  | "info"
  | "body_map";

export type PrefillSource =
  | "none"
  | "customer_name"
  | "phone"
  | "email"
  | "date_of_birth"
  | "address"
  | "today";

export type SignerRole = "client" | "therapist" | "witness";

export type ExtractionStatus = "none" | "processing" | "done" | "failed";

export interface FormOption {
  key: string;
  label: string;
  enabled: boolean;
  is_alert: boolean;
}

export interface FormField {
  key: string;
  type: FieldType;
  label: string;
  help_text: string;
  enabled: boolean;
  required: boolean;
  options: FormOption[];
  allow_other: boolean;
  detail_label: string;
  alert_on_yes: boolean;
  scale_min: number;
  scale_max: number;
  scale_min_label: string;
  scale_max_label: string;
  content: string[];
  signer_role: SignerRole;
  prefill_from: PrefillSource;
  width: "full" | "half";
}

export interface FormSection {
  key: string;
  title: string;
  description: string;
  enabled: boolean;
  fields: FormField[];
}

export interface FormSigner {
  role: SignerRole;
  label: string;
  required: boolean;
}

export interface SourceFile {
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number;
}

export interface ReviewEntry {
  action:
    | "created"
    | "extracted"
    | "submitted"
    | "withdrawn"
    | "approved"
    | "rejected"
    | "archived"
    | "new_version"
    | "restored";
  by_name?: string;
  notes?: string;
  at: string;
}

export interface FormTemplate {
  _id: string;
  name: string;
  description: string;
  category: FormCategory;
  status: FormStatus;
  version: number;
  template_group_id: string;
  previous_version_id?: string | null;
  sections: FormSection[];
  signers: FormSigner[];
  declaration: string;
  linked_service_ids: string[];
  source_files: SourceFile[];
  extraction: {
    status: ExtractionStatus;
    error?: string;
    started_at?: string | null;
    finished_at?: string | null;
    crossed_out_count?: number;
  };
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by_name?: string;
  review_notes?: string;
  review_history: ReviewEntry[];
  createdAt: string;
  updatedAt: string;
}

/** Library rows come back without sections / history. */
export type FormTemplateSummary = Omit<FormTemplate, "sections" | "review_history">;

export type EditableForm = Pick<
  FormTemplate,
  "name" | "description" | "category" | "sections" | "signers" | "declaration"
>;
