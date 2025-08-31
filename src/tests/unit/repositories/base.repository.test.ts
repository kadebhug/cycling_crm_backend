import { Model, ModelStatic } from 'sequelize';
import { BaseRepository, PaginationOptions } from '../../../repositories/base.repository';

// Mock model for testing
class TestModel extends Model {
  public id!: string;
  public name!: string;
  public isActive!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
}

class TestRepository extends BaseRepository<TestModel> {
  constructor(model: ModelStatic<TestModel>) {
    super(model);
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let mockModel: jest.Mocked<ModelStatic<TestModel>>;

  beforeEach(() => {
    // Create mock model
    mockModel = {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
      count: jest.fn(),
      findAndCountAll: jest.fn(),
      bulkCreate: jest.fn(),
    } as any;

    repository = new TestRepository(mockModel);
  });

  describe('create', () => {
    it('should create a new record', async () => {
      const data = { name: 'Test Item', isActive: true };
      const mockResult = { id: '123', ...data } as TestModel;
      mockModel.create.mockResolvedValue(mockResult);

      const result = await repository.create(data);

      expect(mockModel.create).toHaveBeenCalledWith(data, {});
      expect(result).toEqual(mockResult);
    });
  });

  describe('findById', () => {
    it('should find a record by ID', async () => {
      const mockResult = { id: '123', name: 'Test Item' } as TestModel;
      mockModel.findByPk.mockResolvedValue(mockResult);

      const found = await repository.findById('123');

      expect(mockModel.findByPk).toHaveBeenCalledWith('123', {
        where: { id: '123' },
        include: undefined,
        transaction: undefined,
      });
      expect(found).toEqual(mockResult);
    });

    it('should return null for non-existent ID', async () => {
      mockModel.findByPk.mockResolvedValue(null);

      const found = await repository.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all records', async () => {
      const mockResults = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ] as TestModel[];
      mockModel.findAll.mockResolvedValue(mockResults);

      const results = await repository.findAll();

      expect(mockModel.findAll).toHaveBeenCalledWith({
        where: undefined,
        include: undefined,
        order: undefined,
        limit: undefined,
        offset: undefined,
        transaction: undefined,
      });
      expect(results).toEqual(mockResults);
    });

    it('should find records with where clause', async () => {
      const mockResults = [{ id: '1', name: 'Active Item', isActive: true }] as TestModel[];
      mockModel.findAll.mockResolvedValue(mockResults);

      const results = await repository.findAll({ where: { isActive: true } });

      expect(mockModel.findAll).toHaveBeenCalledWith({
        where: { isActive: true },
        include: undefined,
        order: undefined,
        limit: undefined,
        offset: undefined,
        transaction: undefined,
      });
      expect(results).toEqual(mockResults);
    });
  });

  describe('findOne', () => {
    it('should find a single record by criteria', async () => {
      const mockResult = { id: '1', name: 'Unique Item' } as TestModel;
      mockModel.findOne.mockResolvedValue(mockResult);

      const found = await repository.findOne({ name: 'Unique Item' });

      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: { name: 'Unique Item' },
        include: undefined,
        transaction: undefined,
      });
      expect(found).toEqual(mockResult);
    });

    it('should return null if no record matches', async () => {
      mockModel.findOne.mockResolvedValue(null);

      const found = await repository.findOne({ name: 'Non-existent' });

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an existing record', async () => {
      const mockUpdatedRecord = { id: '123', name: 'Updated Name' } as TestModel;
      mockModel.update.mockResolvedValue([1]);
      mockModel.findByPk.mockResolvedValue(mockUpdatedRecord);

      const updated = await repository.update('123', { name: 'Updated Name' });

      expect(mockModel.update).toHaveBeenCalledWith(
        { name: 'Updated Name' },
        { where: { id: '123' }, transaction: undefined }
      );
      expect(updated).toEqual(mockUpdatedRecord);
    });

    it('should return null for non-existent ID', async () => {
      mockModel.update.mockResolvedValue([0]);

      const updated = await repository.update('non-existent-id', { name: 'Updated' });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete an existing record', async () => {
      mockModel.destroy.mockResolvedValue(1);

      const deleted = await repository.delete('123');

      expect(mockModel.destroy).toHaveBeenCalledWith({
        where: { id: '123' },
      });
      expect(deleted).toBe(true);
    });

    it('should return false for non-existent ID', async () => {
      mockModel.destroy.mockResolvedValue(0);

      const deleted = await repository.delete('non-existent-id');

      expect(deleted).toBe(false);
    });
  });

  describe('count', () => {
    it('should count all records', async () => {
      mockModel.count.mockResolvedValue(5);

      const count = await repository.count();

      expect(mockModel.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(count).toBe(5);
    });

    it('should count records with where clause', async () => {
      mockModel.count.mockResolvedValue(3);

      const count = await repository.count({ isActive: true });

      expect(mockModel.count).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(count).toBe(3);
    });
  });

  describe('exists', () => {
    it('should return true if record exists', async () => {
      mockModel.count.mockResolvedValue(1);

      const exists = await repository.exists({ name: 'Existing Item' });

      expect(mockModel.count).toHaveBeenCalledWith({
        where: { name: 'Existing Item' },
        transaction: undefined,
      });
      expect(exists).toBe(true);
    });

    it('should return false if record does not exist', async () => {
      mockModel.count.mockResolvedValue(0);

      const exists = await repository.exists({ name: 'Non-existent Item' });

      expect(exists).toBe(false);
    });
  });

  describe('findWithPagination', () => {
    it('should return paginated results', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
      ] as TestModel[];
      
      mockModel.findAndCountAll.mockResolvedValue({
        rows: mockData,
        count: 10,
      } as any);

      const paginationOptions: PaginationOptions = {
        page: 1,
        limit: 3,
      };

      const result = await repository.findWithPagination(paginationOptions);

      expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
        where: undefined,
        include: undefined,
        order: undefined,
        limit: 3,
        offset: 0,
        transaction: undefined,
      });

      expect(result.data).toEqual(mockData);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.totalPages).toBe(4);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
    });

    it('should work with sorting', async () => {
      const mockData = [{ id: '1', name: 'Item 1' }] as TestModel[];
      mockModel.findAndCountAll.mockResolvedValue({
        rows: mockData,
        count: 1,
      } as any);

      const paginationOptions: PaginationOptions = {
        page: 1,
        limit: 3,
        sortBy: 'name',
        sortOrder: 'DESC',
      };

      await repository.findWithPagination(paginationOptions);

      expect(mockModel.findAndCountAll).toHaveBeenCalledWith({
        where: undefined,
        include: undefined,
        order: [['name', 'DESC']],
        limit: 3,
        offset: 0,
        transaction: undefined,
      });
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple records', async () => {
      const data = [
        { name: 'Bulk Item 1' },
        { name: 'Bulk Item 2' },
        { name: 'Bulk Item 3' },
      ];
      const mockResults = data.map((item, index) => ({ id: `${index + 1}`, ...item })) as TestModel[];
      mockModel.bulkCreate.mockResolvedValue(mockResults);

      const results = await repository.bulkCreate(data);

      expect(mockModel.bulkCreate).toHaveBeenCalledWith(data, {});
      expect(results).toEqual(mockResults);
    });
  });

  describe('bulkUpdate', () => {
    it('should update multiple records', async () => {
      mockModel.update.mockResolvedValue([2]);

      const affectedCount = await repository.bulkUpdate(
        { isActive: false },
        { isActive: true }
      );

      expect(mockModel.update).toHaveBeenCalledWith(
        { isActive: false },
        { where: { isActive: true }, transaction: undefined }
      );
      expect(affectedCount).toBe(2);
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple records', async () => {
      mockModel.destroy.mockResolvedValue(2);

      const deletedCount = await repository.bulkDelete({ isActive: true });

      expect(mockModel.destroy).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(deletedCount).toBe(2);
    });
  });
});