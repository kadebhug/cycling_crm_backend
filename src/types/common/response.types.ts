// API response types

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface CommonErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
}

export type CommonApiResponse<T = any> = SuccessResponse<T> | CommonErrorResponse;

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationErrorResponse extends CommonErrorResponse {
  details: ValidationError[];
}
