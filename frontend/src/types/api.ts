/**
 * Generic API response types matching backend contract
 */

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  detail?: string;
  error?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}