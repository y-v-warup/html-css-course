// Shared contract between the FastAPI backend and the React frontend.

export type FieldState = "detected" | "review" | "missing" | "not_applicable";

export type OverallStatus =
  | "DECLARATIONS DETECTED"
  | "REVIEW REQUIRED"
  | "MISSING DECLARATIONS";

export type AnalysisMode = "live" | "demo";

export type GroupKey =
  | "product"
  | "manufacturer"
  | "traceability"
  | "food"
  | "identification";

export interface FieldResult {
  key: string;
  label: string;
  group: GroupKey;
  state: FieldState;
  value: string;
  note?: string;
}

export interface Issue {
  field: string;
  label: string;
  message: string;
  action: string;
  severity: "review" | "missing";
}

export interface AnalysisResult {
  // Flat contract (spec §25)
  product_name: string;
  net_quantity: string;
  mrp: string;
  manufacturer: string;
  consumer_care: string;
  country_of_origin: string;
  batch_lot: string;
  manufacturing_date: string;
  expiry_best_before: string;
  fssai: string;
  barcode_or_gtin: string;
  qr_details: string;
  coverage: number;
  status: OverallStatus;
  source: string;

  // Structured extensions used by the result dashboard
  product_category: string;
  category_label: string;
  qr_detected: boolean;
  analyzed_at: string;
  mode: AnalysisMode;
  ai_configured: boolean;
  fields: FieldResult[];
  issues: Issue[];
  suggestions: string[];
  notes: string[];
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  ai_configured: boolean;
}

export interface AnalyzePayload {
  front_image?: string;
  back_image?: string;
  qr_data?: string;
  demo_sample?: string;
  category_hint?: string;
}
