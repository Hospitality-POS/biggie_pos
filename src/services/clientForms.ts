import { BASE_URL } from "@utils/config";
import axiosInstance from "./request";
import type {
  EditableForm,
  FormCategory,
  FormStatus,
  FormTemplate,
  FormTemplateSummary,
} from "@pages/ClientForms/types";

const url = (path = "") => `${BASE_URL}/client-forms${path}`;

// Approval actions are POSTs, which the request interceptor would otherwise
// read as "create"; name the permission each one really needs.
const as = (permission: string) => ({ headers: { "x-permission": permission } });

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

export const fetchClientForms = async (params: {
  status?: string;
  category?: string;
  search?: string;
} = {}): Promise<FormListResponse> => {
  const res = await axiosInstance.get(url(), { params });
  return { data: res.data.data, counts: res.data.counts ?? {} };
};

export const fetchClientForm = async (id: string): Promise<FormTemplate> =>
  unwrap(await axiosInstance.get(url(`/${id}`)));

export const fetchClientFormVersions = async (id: string) =>
  unwrap<Pick<FormTemplate, "_id" | "name" | "version" | "status" | "approved_at" | "approved_by_name" | "updatedAt">[]>(
    await axiosInstance.get(url(`/${id}/versions`))
  );

export const uploadClientForm = async (input: {
  files: File[];
  name?: string;
  category?: FormCategory;
}): Promise<FormTemplate> => {
  const body = new FormData();
  input.files.forEach((f) => body.append("files", f));
  if (input.name) body.append("name", input.name);
  if (input.category) body.append("category", input.category);
  return unwrap(await axiosInstance.post(url("/extract"), body, as("CLIENT_FORMS_CREATE")));
};

export const createBlankClientForm = async (input: Partial<EditableForm>): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(), input, as("CLIENT_FORMS_CREATE")));

export const updateClientForm = async (id: string, input: Partial<EditableForm>): Promise<FormTemplate> =>
  unwrap(await axiosInstance.put(url(`/${id}`), input, as("CLIENT_FORMS_UPDATE")));

export const reExtractClientForm = async (id: string): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/re-extract`), {}, as("CLIENT_FORMS_UPDATE")));

export const submitClientForm = async (id: string, notes?: string): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/submit`), { notes }, as("CLIENT_FORMS_UPDATE")));

export const withdrawClientForm = async (id: string): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/reject`), { withdraw: true }, as("CLIENT_FORMS_UPDATE")));

export const rejectClientForm = async (id: string, notes: string): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/reject`), { notes }, as("CLIENT_FORMS_APPROVE")));

export const approveClientForm = async (id: string, notes?: string): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/approve`), { notes }, as("CLIENT_FORMS_APPROVE")));

export const newClientFormVersion = async (id: string): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/new-version`), {}, as("CLIENT_FORMS_UPDATE")));

export const duplicateClientForm = async (id: string): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/duplicate`), {}, as("CLIENT_FORMS_CREATE")));

export const archiveClientForm = async (id: string): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/archive`), {}, as("CLIENT_FORMS_UPDATE")));

export const restoreClientForm = async (id: string): Promise<FormTemplate> =>
  unwrap(await axiosInstance.post(url(`/${id}/restore`), {}, as("CLIENT_FORMS_APPROVE")));

export const deleteClientForm = async (id: string): Promise<void> => {
  await axiosInstance.delete(url(`/${id}`), as("CLIENT_FORMS_DELETE"));
};
