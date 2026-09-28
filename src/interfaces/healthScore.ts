export interface BusinessInfo {
  id: string | null;
  name: string | null;
  company_code: string | null;
  business_type: string | null;
  business_size: string | null;
  base_currency: string;
  modules_enabled: string[];
}

export interface DimensionInfo {
  label: string;
  weight: number;
  score: number;
  imputed: boolean;
  measures_available: number;
  measures_total: number;
}

export interface MeasureItem {
  id: string;
  label: string;
  dimension: string;
  value: number;
  unit: string;
  score: number;
  base_weight: number;
  weight: number;
  weight_in_dimension: number;
  weight_in_score: number;
  supplier: boolean;
}

export interface MeasureUnavailableItem {
  id: string;
  label: string;
  dimension: string;
}

export interface RedFlagItem {
  flag: string;
  detail: string;
  cap: number;
}

export interface DriverItem {
  measure: string;
  score: number;
  impact: number;
}

export interface DriversInfo {
  positive: DriverItem[];
  negative: DriverItem[];
}

export interface ShopScoreItem {
  shop_id: string;
  name: string | null;
  pos_mode: string | null;
  status: string;
  revenue_t12m: number;
  revenue_share: number;
  revenue_t3m: number;
  revenue_p3m: number;
  declining: boolean;
  score: number | null;
  band: string | null;
}

export interface CoverageRowItem {
  endpoint: string;
  calls: number;
  ok: number;
  records: number;
  errors: string[];
}

export interface SupplierTrackingContext {
  traceability_index: number | null;
  tracking_share: number;
  purchase_value_12m: number;
  tier_counts: Record<string, number>;
}

export interface HealthScoreResult {
  engine_version: string;
  as_of: string;
  scored_at: string;
  status: "scored" | "insufficient_data" | "data_unavailable" | string;
  score: number | null;
  score_uncapped: number;
  band: "Strong" | "Healthy" | "Watch" | "Weak" | "Distressed" | string;
  confidence: "High" | "Medium" | "Low" | string;
  products_used: string[] | null;
  measure_weight_available: number;
  business: BusinessInfo;
  dimensions: Record<string, DimensionInfo>;
  measures: MeasureItem[];
  measures_not_available: MeasureUnavailableItem[];
  red_flags: RedFlagItem[];
  drivers: DriversInfo;
  shops: ShopScoreItem[];
  shop_network: {
    score: number;
    shops_compared: number;
    parts: Record<string, any>;
  } | null;
  aging: Record<string, Record<string, number>>;
  context: {
    supplier_tracking: SupplierTrackingContext;
    [key: string]: any;
  };
  data_coverage: CoverageRowItem[];
  data_warnings: string[];
  record_counts: Record<string, number>;
  scored_as: {
    user: string | null;
    is_admin: boolean | null;
    note: string | null;
  };
  duration_seconds: number;
}

export interface BusinessHealthApiResponse {
  success: boolean;
  source: "cache" | "computed";
  data: HealthScoreResult;
  message?: string;
  error?: string;
}
