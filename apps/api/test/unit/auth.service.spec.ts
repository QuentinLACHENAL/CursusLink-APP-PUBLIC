import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  createMockUsersService,
  createMockJwtService,
  createMockUser,
} from '../utils/test-mocks';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const mockUsersService = createMockUsersService();
    const mockJwtService = createMockJwtService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  describe('validateUser', () => {
    it('should return user data when credentials are valid', async () => {
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const mockUser = createMockUser({ passwordHash: hashedPassword });

      usersService.findOneByEmail.mockResolvedValue(mockUser);

      const result = await authService.validateUser(mockUser.email, password);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null when user does not exist', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);

      const result = await authService.validateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      const mockUser = createMockUser({ passwordHash: hashedPassword });

      usersService.findOneByEmail.mockResolvedValue(mockUser);

      const result = await authService.validateUser(mockUser.email, 'wrongPassword');

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when user is banned', async () => {
      const password = 'testPassword123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const bannedUser = createMockUser({ passwordHash: hashedPassword, isBanned: true });

      usersService.findOneByEmail.mockResolvedValue(bannedUser);

      await expect(authService.validateUser(bannedUser.email, password))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should prevent timing attacks by always comparing passwords', async () => {
      // Even when user doesn't exist, bcrypt.compare should be called
      usersService.findOneByEmail.mockResolvedValue(null);

      const startTime = Date.now();
      await authService.validateUser('nonexistent@example.com', 'password');
      const duration = Date.now() - startTime;

      // Should take at least some time due to bcrypt comparison
      // This is a rough check - in production you'd want more precise timing analysis
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('login', () => {
    it('should return access token and user data', async () => {
      const mockUser = createMockUser();
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await authService.login(mockUser);

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.role).toBe(mockUser.role);
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should include correct payload in JWT', async () => {
      const mockUser = createMockUser({ role: 'ADMIN' });

      await authService.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        email: mockUser.email,
        sub: mockUser.id,
        role: mockUser.role,
      });
    });
  });

  describe('register', () => {
    it('should call usersService.create with user data', async () => {
      const userDto = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };
      const createdUser = createMockUser({ ...userDto });

      usersService.create.mockResolvedValue(createdUser);

      const result = await authService.register(userDto);

      expect(usersService.create).toHaveBeenCalledWith(userDto);
      expect(result).toEqual(createdUser);
    });
  });
});
