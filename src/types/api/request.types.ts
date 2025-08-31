// API request types

export interface ApiRequest {
  body: any;
  params: any;
  query: any;
  headers: any;
  user?: any;
}

export interface AuthenticatedRequest extends ApiRequest {
  user: {
    id: number;
    email: string;
    role: string;
    permissions: string[];
  };
}

export interface PaginatedRequest extends ApiRequest {
  query: {
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: string;
    search?: string;
  };
}
