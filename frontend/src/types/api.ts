export interface HealthResponse {
  status: string;
  application: string;
  version: string;
}

export interface DatabaseHealthResponse {
  status: string;
  database: string;
  dialect: string;
  mode: string;
  detail?: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
