import axiosInstance from "./request";

// Quotations (Orders → Quotations). Backend: biggie_api /quotations.

export type QuotationStatus = "draft" | "sent" | "accepted" | "declined" | "expired";

export interface QuoteLine {
    _id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount?: number;
    image?: string;
}

export interface QuoteSection {
    _id?: string;
    title: string;
    currency?: string;
    lines: QuoteLine[];
    vat_rate?: number;
    subtotal?: number;
    vat_amount?: number;
    total?: number;
}

export interface QuoteTextBlock {
    _id?: string;
    heading: string;
    body: string;
}

export interface QuoteSpecGroup {
    _id?: string;
    title: string;
    image?: string;
    image_caption?: string;
    rows: { label: string; value: string }[];
}

export interface QuoteFeature {
    _id?: string;
    name: string;
    description?: string;
    image?: string;
    included?: boolean;
}

export interface QuoteGalleryItem {
    _id?: string;
    image: string;
    caption?: string;
}

export interface QuoteClient {
    name?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    kra_pin?: string;
}

export interface QuotationTemplate {
    _id: string;
    name: string;
    layout: string;
    is_default?: boolean;
    header_image?: string;
    footer_image?: string;
    accent_color?: string;
    secondary_color?: string;
    defaults?: {
        intro?: string;
        objectives_heading?: string;
        section_titles?: string[];
        currency?: string;
        validity_days?: number;
        blocks?: { heading: string; body: string }[];
        spec_note?: string;
    };
}

export interface Quotation {
    _id?: string;
    quote_no?: string;
    title: string;
    status?: QuotationStatus;
    template_id?: string | null;
    layout?: string;
    issue_date?: string;
    valid_until?: string;
    currency?: string;
    customer_id?: string | null;
    client?: QuoteClient;
    intro?: string;
    objectives_heading?: string;
    objectives?: string;
    sections: QuoteSection[];
    grand_total?: number;
    blocks?: QuoteTextBlock[];
    spec_heading?: string;
    spec_groups?: QuoteSpecGroup[];
    spec_note?: string;
    features_heading?: string;
    features?: QuoteFeature[];
    gallery_heading?: string;
    gallery?: QuoteGalleryItem[];
    header_image?: string;
    footer_image?: string;
    /** Set once the quote has been converted to an invoice */
    invoice_id?: string | null;
    invoice_no?: string;
    createdAt?: string;
    updatedAt?: string;
    /** Returned by GET /quotations/:id */
    template?: QuotationTemplate | null;
}

export interface QuotationListResponse {
    data: Quotation[];
    total: number;
    page: number;
    limit: number;
    summary: { _id: QuotationStatus; count: number; value: number }[];
}

export interface QuotationListParams {
    status?: QuotationStatus;
    search?: string;
    page?: number;
    limit?: number;
}

const base = "/quotations";

export const listQuotations = async (params: QuotationListParams = {}) =>
    (await axiosInstance.get<QuotationListResponse>(base, { params })).data;

export const getQuotation = async (id: string) =>
    (await axiosInstance.get<{ data: Quotation }>(`${base}/${id}`)).data.data;

export const createQuotation = async (body: Quotation) =>
    (await axiosInstance.post<{ data: Quotation }>(base, body)).data.data;

export const updateQuotation = async (id: string, body: Quotation) =>
    (await axiosInstance.put<{ data: Quotation }>(`${base}/${id}`, body)).data.data;

export const setQuotationStatus = async (id: string, status: QuotationStatus) =>
    (await axiosInstance.patch<{ data: Quotation }>(`${base}/${id}/status`, { status })).data.data;

export const duplicateQuotation = async (id: string) =>
    (await axiosInstance.post<{ data: Quotation }>(`${base}/${id}/duplicate`)).data.data;

export const deleteQuotation = async (id: string) => {
    await axiosInstance.delete(`${base}/${id}`);
};

/** Uploads an image to DigitalOcean Spaces and returns its public URL */
export const uploadQuotationImage = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await axiosInstance.post<{ url: string }>(`${base}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.url;
};

export const listQuotationTemplates = async () =>
    (await axiosInstance.get<{ data: QuotationTemplate[] }>(`${base}/templates`)).data.data;

export const createQuotationTemplate = async (body: Partial<QuotationTemplate>) =>
    (await axiosInstance.post<{ data: QuotationTemplate }>(`${base}/templates`, body)).data.data;

export const updateQuotationTemplate = async (id: string, body: Partial<QuotationTemplate>) =>
    (await axiosInstance.put<{ data: QuotationTemplate }>(`${base}/templates/${id}`, body)).data.data;

export const deleteQuotationTemplate = async (id: string) => {
    await axiosInstance.delete(`${base}/templates/${id}`);
};

export const apiErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || fallback;

/** Links the invoice made from a quote; the API marks the quote accepted */
export const markQuotationConverted = async (id: string, invoiceId: string) =>
    (await axiosInstance.post<{ data: Quotation }>(`${base}/${id}/converted`, { invoice_id: invoiceId })).data.data;
