import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";
import type {
  Audience,
  EditableForm,
  FormCategory,
  FormStatus,
  FormTemplate,
  FormTemplateSummary,
} from "@pages/FormsPlans/forms/types";
import { audienceConfig } from "@pages/FormsPlans/audience";

const url = (path = "") => `${BASE_URL}/form-templates${path}`;

// Approval actions are POSTs, which the request interceptor would otherwise
// read as "create"; name the permission each one really needs (it differs
// between client and employee forms).
const as = (audience: Audience | undefined, action: keyof ReturnType<typeof audienceConfig>["perms"]) => ({
  headers: { "x-permission": audienceConfig(audience).perms[action] },
});

const unwrap = <T>(res: { data: { data: T } }) => res.data.data;

/**
 * The API's message for a failed call, or null when the request interceptor
 * has already shown one (401/403/404/409, permission blocks).
 */
export const apiErrorMessage = (error: unknown, fallback: string): string | null => {
  const e = error as {
    isPermissionError?: boolean;
    response?: { status?: number; data?: { message?: string } };
  };
  if (e?.isPermissionError) return null;
  if ([401, 403, 404, 409].includes(e?.response?.status ?? 0)) return null;
  return e?.response?.data?.message || fallback;
};

export interface FormListResponse {
  data: FormTemplateSummary[];
  counts: Partial<Record<FormStatus, number>>;
}

export const fetchFormTemplates = async (
  audience: Audience,
  params: { status?: string; category?: string; search?: string } = {}
): Promise<FormListResponse> => {
  const res = await axiosInstance.get(url(), { params: { ...params, audience }, ...as(audience, "view") });
  return { data: res.data.data, counts: res.data.counts ?? {} };
};

export const fetchFormTemplate = async (id: string, audience?: Audience): Promise<FormTemplate> =>
  unwrap(await axiosInstance.get(url(`/${id}`), as(audience, "view")));

export const fetchFormVersions = async (id: string, audience?: Audience) =>
  unwrap<Pick<FormTemplate, "_id" | "name" | "version" | "status" | "approved_at" | "approved_by_name" | "updatedAt">[]>(
    await axiosInstance.get(url(`/${id}/versions`), as(audience, "view"))
  );

export const uploadFormTemplate = async (input: {
  audience: Audience;
  files: File[];
  name?: string;
  category?: FormCategory;
}): Promise<FormTemplate> => {
  const body = new FormData();
  input.files.forEach((f) => body.append("files", f));
  body.append("audience", input.audience);
  if (input.name) body.append("name", input.name);
  if (input.category) body.append("category", input.category);
  return unwrap(await axiosInstance.post(url("/extract"), body, as(input.audience, "create")));
};

export const createBlankForm = async (audience: Audience, input: Partial<EditableForm>): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(), { ...input, audience }, as(audience, "create")));

export const updateFormTemplate = async (id: string, input: Partial<EditableForm>, audience?: Audience): Promise<FormTemplate> =>
  unwrap(await axiosInstance.put(url(`/${id}`), input, as(audience, "update")));

export const reExtractForm = async (id: string, audience?: Audience): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/re-extract`), {}, as(audience, "update")));

export const submitForm = async (id: string, notes?: string, audience?: Audience): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/submit`), { notes }, as(audience, "update")));

export const withdrawForm = async (id: string, audience?: Audience): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/reject`), { withdraw: true }, as(audience, "update")));

export const rejectForm = async (id: string, notes: string, audience?: Audience): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/reject`), { notes }, as(audience, "approve")));

export const approveForm = async (id: string, notes?: string, audience?: Audience): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/approve`), { notes }, as(audience, "approve")));

export const newFormVersion = async (id: string, audience?: Audience): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/new-version`), {}, as(audience, "update")));

export const duplicateForm = async (id: string, audience?: Audience): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/duplicate`), {}, as(audience, "create")));

export const archiveForm = async (id: string, audience?: Audience): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/archive`), {}, as(audience, "update")));

export const restoreForm = async (id: string, audience?: Audience): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/restore`), {}, as(audience, "approve")));

export const deleteForm = async (id: string, audience?: Audience): Promise<void> => {
  await axiosInstance.delete(url(`/${id}`), as(audience, "delete"));
};
