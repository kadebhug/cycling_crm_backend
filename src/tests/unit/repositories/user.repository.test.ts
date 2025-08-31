import { UserRepository, UserCreateData } from '../../../repositories/user.repository';
import { UserRole, Permission } from '../../../types/database/database.types';

// Mock the User model
jest.mock('../../../database/models/User');
jest.mock('../../../database/models/Store');
jest.mock('../../../database/models/StaffStorePermission');

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user with normalized email', async () => {
      const userData: UserCreateData = {
        email: 'TEST@EXAMPLE.COM',
        passwordHash: 'hashedpassword',
        role: UserRole.CUSTOMER,
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUser = {
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.CUSTOMER,
      };

      // Mock the create method
      const createSpy = jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser as any);

      const user = await userRepository.createUser(userData);

      expect(createSpy).toHaveBeenCalledWith({
        ...userData,
        email: 'test@example.com', // Should be normalized to lowercase
      }, { transaction: undefined });
      expect(user).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should call findOne with normalized email', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const findOneSpy = jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any);

      const found = await userRepository.findByEmail('TEST@EXAMPLE.COM');

      expect(findOneSpy).toHaveBeenCalledWith({ email: 'test@example.com' }, {});
      expect(found).toEqual(mockUser);
    });
  });

  describe('updatePassword', () => {
    it('should call update with password hash', async () => {
      const mockUser = { id: '123', passwordHash: 'newpassword' };
      const updateSpy = jest.spyOn(userRepository, 'update').mockResolvedValue(mockUser as any);

      const updated = await userRepository.updatePassword('123', 'newpassword');

      expect(updateSpy).toHaveBeenCalledWith('123', { passwordHash: 'newpassword' }, { transaction: undefined });
      expect(updated).toEqual(mockUser);
    });
  });

  describe('verifyEmail', () => {
    it('should call update with email verification data', async () => {
      const mockUser = { id: '123', emailVerified: true, emailVerificationToken: null };
      const updateSpy = jest.spyOn(userRepository, 'update').mockResolvedValue(mockUser as any);

      const verified = await userRepository.verifyEmail('123');

      expect(updateSpy).toHaveBeenCalledWith('123', { 
        emailVerified: true, 
        emailVerificationToken: null 
      }, { transaction: undefined });
      expect(verified).toEqual(mockUser);
    });
  });

  describe('setPasswordResetToken', () => {
    it('should call update with reset token data', async () => {
      const expiresAt = new Date();
      const mockUser = { id: '123', passwordResetToken: 'token', passwordResetExpires: expiresAt };
      const updateSpy = jest.spyOn(userRepository, 'update').mockResolvedValue(mockUser as any);

      const updated = await userRepository.setPasswordResetToken('123', 'token', expiresAt);

      expect(updateSpy).toHaveBeenCalledWith('123', { 
        passwordResetToken: 'token',
        passwordResetExpires: expiresAt
      }, { transaction: undefined });
      expect(updated).toEqual(mockUser);
    });
  });

  describe('findByRole', () => {
    it('should call findAll with role filter', async () => {
      const mockUsers = [{ id: '123', role: UserRole.ADMIN }];
      const findAllSpy = jest.spyOn(userRepository, 'findAll').mockResolvedValue(mockUsers as any);

      const users = await userRepository.findByRole(UserRole.ADMIN);

      expect(findAllSpy).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN }
      });
      expect(users).toEqual(mockUsers);
    });
  });

  describe('deactivateUser', () => {
    it('should call update with isActive false', async () => {
      const mockUser = { id: '123', isActive: false };
      const updateSpy = jest.spyOn(userRepository, 'update').mockResolvedValue(mockUser as any);

      const deactivated = await userRepository.deactivateUser('123');

      expect(updateSpy).toHaveBeenCalledWith('123', { isActive: false }, { transaction: undefined });
      expect(deactivated).toEqual(mockUser);
    });
  });

  describe('activateUser', () => {
    it('should call update with isActive true', async () => {
      const mockUser = { id: '123', isActive: true };
      const updateSpy = jest.spyOn(userRepository, 'update').mockResolvedValue(mockUser as any);

      const activated = await userRepository.activateUser('123');

      expect(updateSpy).toHaveBeenCalledWith('123', { isActive: true }, { transaction: undefined });
      expect(activated).toEqual(mockUser);
    });
  });
});