import request from "../request";

// Asset Types
export interface Asset {
  _id: string;
  asset_no: string;
  asset_name: string;
  description: string;
  serial_number: string;
  tag_number: string;
  asset_category: string;
  asset_type: string;
  acquisition_date: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_years: number;
  depreciation_method: string;
  accumulated_depreciation: number;
  net_book_value: number;
  current_location: string;
  department: string;
  custodian: {
    _id: string;
    username: string;
    name: string;
  };
  status: string;
  condition: string;
  currency: string;
  exchange_rate: number;
  cost_base_currency: number;
  warranty_expiry: string;
  insurance_details: {
    policy_number: string;
    insurer: string;
    coverage_amount: number;
    expiry_date: string;
  };
  notes: string;
  journal_entry_id: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetRequest {
  _id: string;
  request_no: string;
  requester_id: string;
  requester_name: string;
  department_id: string;
  department_name: string;
  location: string;
  asset_category: string;
  asset_type: string;
  specific_asset_id?: string;
  quantity_requested: number;
  reason: string;
  justification: string;
  required_by_date: string;
  status: string;
  approval_workflow: Array<{
    approver_id: string;
    approver_name: string;
    approver_role: string;
    order: number;
    status: string;
  }>;
  current_approval_step: number;
  approvals: any[];
  issued_assets: any[];
  issued_date: string | null;
  issued_by: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetMaintenance {
  _id: string;
  asset_id: string;
  asset: {
    asset_name: string;
    asset_no: string;
  };
  maintenance_no: string;
  maintenance_type: string;
  scheduled_date: string;
  completed_date: string | null;
  performed_by_type: string;
  performed_by_user: string;
  vendor_id: string | null;
  vendor_name: string | null;
  cost: number;
  currency: string;
  description: string;
  work_performed: string | null;
  parts_used: Array<{
    part_name: string;
    part_number: string;
    quantity: number;
    unit_cost: number;
  }>;
  status: string;
  notes: string;
  journal_entry_id: string | null;
  createdAt: string;
  updatedAt: string;
}

// API Functions

export const getAssets = async (params: {
  status?: string;
  asset_category?: string;
  department?: string;
  custodian?: string;
  location?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const response = await request.get("/accounting/assets", { params });
  return response.data;
};

export const getAssetById = async (id: string) => {
  const response = await request.get(`/accounting/assets/${id}`);
  return response.data;
};

export const createAsset = async (data: Partial<Asset>) => {
  const response = await request.post("/accounting/assets", data);
  return response.data;
};

export const updateAsset = async (id: string, data: Partial<Asset>) => {
  const response = await request.put(`/accounting/assets/${id}`, data);
  return response.data;
};

export const assignAsset = async (id: string, data: { custodian_id: string; location: string }) => {
  const response = await request.post(`/accounting/assets/${id}/assign`, data);
  return response.data;
};

export const returnAsset = async (id: string) => {
  const response = await request.post(`/accounting/assets/${id}/return`);
  return response.data;
};

export const transferAsset = async (id: string, data: { to_location: string; to_custodian?: string }) => {
  const response = await request.post(`/accounting/assets/${id}/transfer`, data);
  return response.data;
};

export const retireAsset = async (id: string, data: { reason: string }) => {
  const response = await request.post(`/accounting/assets/${id}/retire`, data);
  return response.data;
};

export const disposeAsset = async (id: string, data: { disposal_date: string; disposal_price: number }) => {
  const response = await request.post(`/accounting/assets/${id}/dispose`, data);
  return response.data;
};

export const revalueAsset = async (id: string, data: { new_value: number; reason: string }) => {
  const response = await request.post(`/accounting/assets/${id}/revalue`, data);
  return response.data;
};

export const calculateDepreciation = async (data: { fiscal_year: number; fiscal_month: number; asset_id?: string }) => {
  const response = await request.post("/accounting/assets/calculate-depreciation", data);
  return response.data;
};

export const getAssetSummary = async (params: { from?: string; to?: string; asset_category?: string; status?: string }) => {
  const response = await request.get("/accounting/assets/summary", { params });
  return response.data;
};

export const getAssetRegister = async (params: { from?: string; to?: string }) => {
  const response = await request.get("/accounting/assets/register", { params });
  return response.data;
};

// Asset Requests

export const getAssetRequests = async (params: {
  status?: string;
  requester_id?: string;
  department_id?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const response = await request.get("/accounting/asset-requests", { params });
  return response.data;
};

export const getAssetRequestById = async (id: string) => {
  const response = await request.get(`/accounting/asset-requests/${id}`);
  return response.data;
};

export const createAssetRequest = async (data: Partial<AssetRequest>) => {
  const response = await request.post("/accounting/asset-requests", data);
  return response.data;
};

export const updateAssetRequest = async (id: string, data: Partial<AssetRequest>) => {
  const response = await request.put(`/accounting/asset-requests/${id}`, data);
  return response.data;
};

export const approveAssetRequest = async (id: string, data: { comments?: string }) => {
  const response = await request.patch(`/accounting/asset-requests/${id}/approve`, data);
  return response.data;
};

export const rejectAssetRequest = async (id: string, data: { reason: string }) => {
  const response = await request.patch(`/accounting/asset-requests/${id}/reject`, data);
  return response.data;
};

export const issueAssets = async (id: string, data: { asset_ids: string[] }) => {
  const response = await request.post(`/accounting/asset-requests/${id}/issue`, data);
  return response.data;
};

export const cancelAssetRequest = async (id: string, data: { reason: string }) => {
  const response = await request.patch(`/accounting/asset-requests/${id}/cancel`, data);
  return response.data;
};

export const getRequestSummary = async (params: { from?: string; to?: string; department_id?: string }) => {
  const response = await request.get("/accounting/asset-requests/summary", { params });
  return response.data;
};

// Asset Maintenance

export const getMaintenanceRecords = async (params: {
  status?: string;
  maintenance_type?: string;
  asset_id?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const response = await request.get("/accounting/asset-maintenance", { params });
  return response.data;
};

export const getMaintenanceById = async (id: string) => {
  const response = await request.get(`/accounting/asset-maintenance/${id}`);
  return response.data;
};

export const createMaintenance = async (data: Partial<AssetMaintenance>) => {
  const response = await request.post("/accounting/asset-maintenance", data);
  return response.data;
};

export const updateMaintenance = async (id: string, data: Partial<AssetMaintenance>) => {
  const response = await request.put(`/accounting/asset-maintenance/${id}`, data);
  return response.data;
};

export const startMaintenance = async (id: string) => {
  const response = await request.patch(`/accounting/asset-maintenance/${id}/start`);
  return response.data;
};

export const completeMaintenance = async (id: string, data: { work_performed: string }) => {
  const response = await request.patch(`/accounting/asset-maintenance/${id}/complete`, data);
  return response.data;
};

export const cancelMaintenance = async (id: string, data: { reason: string }) => {
  const response = await request.patch(`/accounting/asset-maintenance/${id}/cancel`, data);
  return response.data;
};

export const getMaintenanceSchedule = async (params: { from?: string; to?: string; asset_id?: string }) => {
  const response = await request.get("/accounting/asset-maintenance/schedule", { params });
  return response.data;
};

// Asset Reports

export const getDepreciationReport = async (params: {
  fiscal_year?: number;
  fiscal_month?: number;
  asset_category?: string;
  asset_id?: string;
}) => {
  const response = await request.get("/accounting/asset-reports/depreciation", { params });
  return response.data;
};

export const getAppreciationReport = async (params: { from?: string; to?: string; asset_category?: string }) => {
  const response = await request.get("/accounting/asset-reports/appreciation", { params });
  return response.data;
};

export const getNetBookValueReport = async (params: { asset_category?: string; status?: string; department?: string }) => {
  const response = await request.get("/accounting/asset-reports/net-book-value", { params });
  return response.data;
};

export const getAssetAgingReport = async (params: { asset_category?: string }) => {
  const response = await request.get("/accounting/asset-reports/aging", { params });
  return response.data;
};

export const getGainLossReport = async (params: { from?: string; to?: string; asset_category?: string }) => {
  const response = await request.get("/accounting/asset-reports/gain-loss", { params });
  return response.data;
};

export const getAssetsByLocationReport = async (params: { status?: string; asset_category?: string }) => {
  const response = await request.get("/accounting/asset-reports/by-location", { params });
  return response.data;
};

export const getAssetsByCustodianReport = async (params: { status?: string; asset_category?: string }) => {
  const response = await request.get("/accounting/asset-reports/by-custodian", { params });
  return response.data;
};

export const getDisposalReport = async (params: { from?: string; to?: string; asset_category?: string }) => {
  const response = await request.get("/accounting/asset-reports/disposals", { params });
  return response.data;
};
