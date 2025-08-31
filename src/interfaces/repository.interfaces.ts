// Repository layer interfaces

export interface BaseRepository<T> {
  findAll(options?: any): Promise<T[]>;
  findById(id: number): Promise<T | null>;
  findOne(where: any): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T | null>;
  delete(id: number): Promise<boolean>;
  count(where?: any): Promise<number>;
}

export interface RepositoryOptions {
  include?: any[];
  where?: any;
  order?: any;
  limit?: number;
  offset?: number;
  transaction?: any;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
