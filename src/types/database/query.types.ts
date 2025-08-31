// Database query types

export interface QueryOptions {
  where?: any;
  include?: any[];
  order?: any;
  limit?: number;
  offset?: number;
  attributes?: string[];
  group?: string[];
  having?: any;
  distinct?: boolean;
  transaction?: any;
}

export interface PaginationQuery {
  page: number;
  limit: number;
  offset: number;
}

export interface SortQuery {
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

export interface FilterQuery {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'notIn';
  value: any;
}
