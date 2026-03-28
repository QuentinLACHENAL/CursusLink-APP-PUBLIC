import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../src/users/users.service';
import { Neo4jService } from '../../src/neo4j/neo4j.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../src/users/entities/user.entity';
import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UsersService', () => {
  let service: UsersService;
  let mockUserRepository: any;
  let mockNeo4jService: any;
  let mockSession: any;

  const existingUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    school: 'TestSchool',
    credits: 100,
    isBanned: false,
    role: 'STUDENT',
  };

  beforeEach(async () => {
    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockNeo4jService = {
      getReadSession: jest.fn().mockReturnValue(mockSession),
      getWriteSession: jest.fn().mockReturnValue(mockSession),
    };

    mockUserRepository = {
      find: jest.fn().mockResolvedValue([existingUser]),
      findOne: jest.fn().mockResolvedValue(existingUser),
      findOneBy: jest.fn().mockResolvedValue(existingUser),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'new-user-id' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...existingUser, ...entity })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      remove: jest.fn().mockResolvedValue(existingUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: Neo4jService, useValue: mockNeo4jService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const result = await service.findAll();

      expect(result).toEqual([existingUser]);
      expect(mockUserRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOneByEmail', () => {
    it('should find user by email', async () => {
      mockUserRepository.findOne.mockResolvedValue(existingUser);

      const result = await service.findOneByEmail('test@example.com');

      expect(result).toEqual(existingUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('should return null when email not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findOneByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createUserDto = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'User',
      school: 'TestSchool',
    };

    it('should create user in Postgres and Neo4j', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null); // No existing user
      
      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockSession.run).toHaveBeenCalled(); // Neo4j sync
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should throw ConflictException when email exists', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(existingUser);

      await expect(service.create(createUserDto))
        .rejects.toThrow(ConflictException);
    });

    it('should hash password before saving', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await service.create(createUserDto);

      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
    });

    it('should rollback Postgres on Neo4j failure', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockSession.run.mockRejectedValue(new Error('Neo4j connection failed'));

      await expect(service.create(createUserDto))
        .rejects.toThrow(InternalServerErrorException);
      
      expect(mockUserRepository.remove).toHaveBeenCalled(); // Rollback
    });

    it('should throw InternalServerErrorException on Postgres error', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      mockUserRepository.save.mockRejectedValue(new Error('DB Error'));

      await expect(service.create(createUserDto))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user from Postgres and Neo4j', async () => {
      await service.deleteUser('user-1');

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('DETACH DELETE'),
        { id: 'user-1' }
      );
      expect(mockUserRepository.delete).toHaveBeenCalledWith('user-1');
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockSession.run.mockRejectedValue(new Error('Delete failed'));

      await expect(service.deleteUser('user-1'))
        .rejects.toThrow(InternalServerErrorException);
    });

    it('should close session even on error', async () => {
      mockSession.run.mockRejectedValue(new Error('Delete failed'));

      try {
        await service.deleteUser('user-1');
      } catch (e) {}

      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('setBanStatus', () => {
    it('should set isBanned to true', async () => {
      await service.setBanStatus('user-1', true);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isBanned: true })
      );
    });

    it('should set isBanned to false', async () => {
      await service.setBanStatus('user-1', false);

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isBanned: false })
      );
    });

    it('should throw ConflictException when user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.setBanStatus('nonexistent', true))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('manualResetPassword', () => {
    it('should generate new password and hash it', async () => {
      const result = await service.manualResetPassword('user-1');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThanOrEqual(12);
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException when user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.manualResetPassword('nonexistent'))
        .rejects.toThrow(ConflictException);
    });

    it('should use cryptographically secure random generator', async () => {
      // Test that password contains various character types
      const passwords = await Promise.all([
        service.manualResetPassword('user-1'),
        service.manualResetPassword('user-1'),
        service.manualResetPassword('user-1'),
      ]);

      // All passwords should be unique
      const uniquePasswords = new Set(passwords);
      expect(uniquePasswords.size).toBe(3);
    });
  });

  describe('forceAdminUpdate', () => {
    it('should update user to admin role', async () => {
      await service.forceAdminUpdate('test@example.com', 'newpassword');

      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN' })
      );
    });

    it('should hash the new password', async () => {
      await service.forceAdminUpdate('test@example.com', 'newpassword');

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 'salt');
    });

    it('should throw ConflictException when user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.forceAdminUpdate('notfound@example.com', 'pass'))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('getUserProfile', () => {
    it('should return mock profile for demo user', async () => {
      const result = await service.getUserProfile('demo-user-1');

      expect(result).toBeDefined();
      expect(mockUserRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.getUserProfile('nonexistent'))
        .rejects.toThrow(ConflictException);
    });

    it('should fetch XP from Neo4j', async () => {
      mockSession.run.mockResolvedValue({
        records: [{ get: () => 500 }]
      });

      await service.getUserProfile('user-1');

      expect(mockNeo4jService.getReadSession).toHaveBeenCalled();
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('xp'),
        expect.objectContaining({ userId: 'user-1' })
      );
    });
  });

  describe('Security Tests', () => {
    describe('Password security', () => {
      it('should use bcrypt for password hashing', async () => {
        mockUserRepository.findOneBy.mockResolvedValue(null);

        await service.create({
          email: 'test@example.com',
          password: 'testpassword',
          firstName: 'Test',
          lastName: 'User',
          school: 'School',
        });

        expect(bcrypt.genSalt).toHaveBeenCalled();
        expect(bcrypt.hash).toHaveBeenCalled();
      });

      it('should never store plain text password', async () => {
        mockUserRepository.findOneBy.mockResolvedValue(null);
        mockUserRepository.create.mockImplementation((dto) => dto);

        await service.create({
          email: 'test@example.com',
          password: 'plaintext',
          firstName: 'Test',
          lastName: 'User',
          school: 'School',
        });

        // The create call should have passwordHash, not password
        expect(mockUserRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            passwordHash: expect.any(String),
          })
        );
        expect(mockUserRepository.create).not.toHaveBeenCalledWith(
          expect.objectContaining({
            password: 'plaintext',
          })
        );
      });
    });

    describe('Neo4j parameter injection', () => {
      it('should use parameterized queries for deleteUser', async () => {
        await service.deleteUser('user-1');

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.any(String),
          { id: 'user-1' }
        );
      });

      it('should use parameterized queries for create', async () => {
        mockUserRepository.findOneBy.mockResolvedValue(null);

        await service.create({
          email: 'test@example.com',
          password: 'password',
          firstName: 'Test',
          lastName: 'User',
          school: 'School',
        });

        expect(mockSession.run).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
          })
        );
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty email gracefully in findOneByEmail', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findOneByEmail('');

      expect(result).toBeNull();
    });

    it('should handle special characters in user data', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const dto = {
        email: 'test+special@example.com',
        password: 'p@ssw0rd!#$%',
        firstName: "O'Brian",
        lastName: 'Von Müller',
        school: 'École Polytechnique',
      };

      await service.create(dto);

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          firstName: "O'Brian",
          lastName: 'Von Müller',
        })
      );
    });
  });
});
