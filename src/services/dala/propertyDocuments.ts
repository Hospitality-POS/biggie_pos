import { message } from "antd";
import axiosInstance from "../request";
import { BASE_URL, POS_API_KEY } from "@utils/config";

const dalaUrl = `${BASE_URL}/api/dala`;

// ── Types ────────────────────────────────────────────────────────────────────

export interface PropertyDocumentAttachment {
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  _id: string;
}

export interface PropertyDocument {
  _id: string;
  name: string;
  description?: string;
  document_type: string;
  status: string;
  attachments: PropertyDocumentAttachment[];
  created_by?: { name: string; username: string };
  created_at: string;
  updated_at: string;
  property_id?: string;
  shop_id?: string;
}

// ── Document Types ─────────────────────────────────────────────────────────────

export const PROPERTY_DOCUMENT_TYPES = [
  { value: 'sale_agreement', label: 'Sale Agreement' },
  { value: 'title_deed', label: 'Title Deed' },
  { value: 'land_search', label: 'Land Search' },
  { value: 'survey_plan', label: 'Survey Plan' },
  { value: 'rates_clearance', label: 'Rates Clearance' },
  { value: 'consent_transfer', label: 'Consent to Transfer' },
  { value: 'property_valuation', label: 'Property Valuation' },
  { value: 'building_plan', label: 'Building Plan' },
  { value: 'occupancy_certificate', label: 'Occupancy Certificate' },
  { value: 'inspection_report', label: 'Inspection Report' },
  { value: 'kra_pin', label: 'KRA PIN' },
  { value: 'id_copy', label: 'ID Copy' },
  { value: 'passport_photo', label: 'Passport Photo' },
  { value: 'contract_agreement', label: 'Contract/Agreement' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'quotation', label: 'Quotation' }
];

// ── API Headers Helper ────────────────────────────────────────────────────────

const getDalaHeaders = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return {
    'x-pos-request': 'true',
    'x-pos-api-key': POS_API_KEY,
    'x-user-id': user?._id || user?.id || 'pos-system',
    'x-user-name': user?.name || user?.username || 'POS User',
    'x-user-email': user?.email || 'pos@system.local'
  };
};

// ── Property Documents API ─────────────────────────────────────────────────────

export const fetchPropertyDocuments = async (property_id: string, shop_id: string) => {
  try {
    const response = await axiosInstance.get(`${dalaUrl}/properties/${property_id}/documents`, {
      params: { shop_id },
      headers: getDalaHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch property documents:", error);
    throw error;
  }
};

export const uploadPropertyDocument = async (
  property_id: string,
  data: {
    shop_id: string;
    document_type: string;
    name?: string;
    description?: string;
    files: File[];
  }
) => {
  try {
    const formData = new FormData();
    formData.append('shop_id', data.shop_id);
    formData.append('document_type', data.document_type);
    if (data.name) formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    data.files.forEach(file => formData.append('files', file));

    const response = await axiosInstance.post(
      `${dalaUrl}/properties/${property_id}/documents`,
      formData,
      {
        headers: {
          ...getDalaHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    // message.success("Document uploaded successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.response?.data?.error || "Failed to upload document";
    message.error(errorMessage);
    throw error;
  }
};

export const updatePropertyDocument = async (
  property_id: string,
  document_id: string,
  data: {
    shop_id: string;
    name?: string;
    description?: string;
    document_type?: string;
    files?: File[];
  }
) => {
  try {
    const formData = new FormData();
    formData.append('shop_id', data.shop_id);
    if (data.name) formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    if (data.document_type) formData.append('document_type', data.document_type);
    if (data.files) {
      data.files.forEach(file => formData.append('files', file));
    }

    const response = await axiosInstance.put(
      `${dalaUrl}/properties/${property_id}/documents/${document_id}`,
      formData,
      {
        headers: {
          ...getDalaHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    // message.success("Document updated successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.response?.data?.error || "Failed to update document";
    message.error(errorMessage);
    throw error;
  }
};

export const deletePropertyDocument = async (property_id: string, document_id: string, shop_id: string) => {
  try {
    const response = await axiosInstance.delete(
      `${dalaUrl}/properties/${property_id}/documents/${document_id}`,
      {
        params: { shop_id },
        headers: getDalaHeaders()
      }
    );
    // message.success("Document deleted successfully");
    return response.data;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.response?.data?.error || "Failed to delete document";
    message.error(errorMessage);
    throw error;
  }
};
