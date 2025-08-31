// API route types

export interface RouteConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: string;
  middleware?: string[];
  validation?: any;
  description?: string;
}

export interface RouteGroup {
  prefix: string;
  routes: RouteConfig[];
  middleware?: string[];
}

export interface ApiVersion {
  version: string;
  routes: RouteGroup[];
  deprecated?: boolean;
}
