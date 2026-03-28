import { Test, TestingModule } from '@nestjs/testing';
import { ShopService } from '../../src/shop/shop.service';
import { ShopItem } from '../../src/shop/entities/shop-item.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../src/users/entities/user.entity';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('ShopService', () => {
  let service: ShopService;
  let mockShopItemRepository: any;
  let mockUserRepository: any;
  let mockDataSource: any;
  let mockTransactionManager: any;

  const mockShopItems: Partial<ShopItem>[] = [
    { id: '1', code: 'title_novice', name: 'Novice', description: 'Le début', type: 'title', value: 'Novice', price: 0, isActive: true, sortOrder: 1 },
    { id: '2', code: 'title_padawan', name: 'Padawan', description: 'La force', type: 'title', value: 'Padawan', price: 100, isActive: true, sortOrder: 2 },
    { id: '3', code: 'color_blue', name: 'Bleu', description: 'Couleur', type: 'nameColor', value: 'text-sky-400', price: 150, isActive: true, sortOrder: 10 },
    { id: '4', code: 'border_gold', name: 'Doré', description: 'Bordure', type: 'avatarBorder', value: 'border-gold', price: 500, isActive: true, sortOrder: 20 },
  ];

  const existingUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    credits: 1000,
    inventory: ['title_novice'],
  };

  beforeEach(async () => {
    mockTransactionManager = {
      findOne: jest.fn().mockResolvedValue({ ...existingUser }),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        return cb(mockTransactionManager);
      }),
    };

    mockShopItemRepository = {
      find: jest.fn().mockResolvedValue(mockShopItems),
      findOne: jest.fn().mockImplementation(({ where }) => {
        const item = mockShopItems.find(i => i.code === where.code);
        return Promise.resolve(item || null);
      }),
      count: jest.fn().mockResolvedValue(mockShopItems.length),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((data) => data),
    };

    mockUserRepository = {
      findOne: jest.fn().mockResolvedValue(existingUser),
      save: jest.fn().mockResolvedValue(existingUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopService,
        { provide: getRepositoryToken(ShopItem), useValue: mockShopItemRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ShopService>(ShopService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCatalog', () => {
    it('should return all active shop items', async () => {
      const catalog = await service.getCatalog();

      expect(Array.isArray(catalog)).toBe(true);
      expect(catalog.length).toBe(mockShopItems.length);
    });

    it('should call repository with correct filters', async () => {
      await service.getCatalog();

      expect(mockShopItemRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { sortOrder: 'ASC', price: 'ASC' },
      });
    });

    it('should include different item types', async () => {
      const catalog = await service.getCatalog();
      const types = new Set(catalog.map((item: ShopItem) => item.type));

      expect(types.has('title')).toBe(true);
      expect(types.has('nameColor')).toBe(true);
      expect(types.has('avatarBorder')).toBe(true);
    });
  });

  describe('getItemByCode', () => {
    it('should return item when found', async () => {
      const item = await service.getItemByCode('title_padawan');
      expect(item).toBeDefined();
      expect(item?.code).toBe('title_padawan');
    });

    it('should return null when item not found', async () => {
      mockShopItemRepository.findOne.mockResolvedValue(null);
      const item = await service.getItemByCode('nonexistent');
      expect(item).toBeNull();
    });
  });

  describe('buyItem', () => {
    beforeEach(() => {
      // Reset findOne to return the padawan item for purchase tests
      mockShopItemRepository.findOne.mockImplementation(({ where }) => {
        if (where.code === 'title_padawan') {
          return Promise.resolve(mockShopItems[1]);
        }
        return Promise.resolve(null);
      });
    });

    it('should allow purchasing available item', async () => {
      const user = { ...existingUser, credits: 1000, inventory: [] };
      mockTransactionManager.findOne.mockResolvedValue(user);

      const result = await service.buyItem('user-1', 'title_padawan');

      expect(result.success).toBe(true);
      expect(mockTransactionManager.save).toHaveBeenCalled();
    });

    it('should deduct credits from user', async () => {
      const user = { ...existingUser, credits: 1000, inventory: [] };
      mockTransactionManager.findOne.mockResolvedValue(user);
      mockTransactionManager.save.mockImplementation((entity: any) => {
        return Promise.resolve(entity);
      });

      await service.buyItem('user-1', 'title_padawan'); // 100 credits

      expect(mockTransactionManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          credits: 900, // 1000 - 100
        })
      );
    });

    it('should add item code to user inventory', async () => {
      const user = { ...existingUser, credits: 1000, inventory: [] };
      mockTransactionManager.findOne.mockResolvedValue(user);

      await service.buyItem('user-1', 'title_padawan');

      expect(mockTransactionManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          inventory: expect.arrayContaining(['title_padawan']),
        })
      );
    });

    it('should throw BadRequestException when item not found', async () => {
      mockShopItemRepository.findOne.mockResolvedValue(null);

      await expect(service.buyItem('user-1', 'nonexistent_item'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user not found', async () => {
      mockTransactionManager.findOne.mockResolvedValue(null);

      await expect(service.buyItem('nonexistent-user', 'title_padawan'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when item already owned', async () => {
      const user = { ...existingUser, inventory: ['title_padawan'] };
      mockTransactionManager.findOne.mockResolvedValue(user);

      await expect(service.buyItem('user-1', 'title_padawan'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when insufficient credits', async () => {
      const poorUser = { ...existingUser, credits: 10, inventory: [] };
      mockTransactionManager.findOne.mockResolvedValue(poorUser);

      await expect(service.buyItem('user-1', 'title_padawan')) // 100 credits
        .rejects.toThrow(BadRequestException);
    });

    it('should include helpful message for insufficient credits', async () => {
      const poorUser = { ...existingUser, credits: 50, inventory: [] };
      mockTransactionManager.findOne.mockResolvedValue(poorUser);

      await expect(service.buyItem('user-1', 'title_padawan'))
        .rejects.toThrow(/manque.*50.*crédits/i);
    });

    it('should use pessimistic locking for race condition protection', async () => {
      const user = { ...existingUser, credits: 1000, inventory: [] };
      mockTransactionManager.findOne.mockResolvedValue(user);

      await service.buyItem('user-1', 'title_padawan');

      expect(mockTransactionManager.findOne).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
        })
      );
    });

    it('should use transaction for atomicity', async () => {
      const user = { ...existingUser, credits: 1000, inventory: [] };
      mockTransactionManager.findOne.mockResolvedValue(user);

      await service.buyItem('user-1', 'title_padawan');

      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should return updated credits, inventory and item info on success', async () => {
      const user = { ...existingUser, credits: 1000, inventory: [] };
      mockTransactionManager.findOne.mockResolvedValue(user);
      mockTransactionManager.save.mockImplementation((entity: any) => {
        return Promise.resolve(entity);
      });

      const result = await service.buyItem('user-1', 'title_padawan');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('newCredits');
      expect(result).toHaveProperty('inventory');
      expect(result).toHaveProperty('item');
      expect(result.item).toHaveProperty('code', 'title_padawan');
    });

    it('should handle null inventory gracefully', async () => {
      const userWithNullInventory = { ...existingUser, credits: 1000, inventory: null };
      mockTransactionManager.findOne.mockResolvedValue(userWithNullInventory);

      const result = await service.buyItem('user-1', 'title_padawan');

      expect(result.success).toBe(true);
    });
  });

  describe('Input validation', () => {
    it('should throw for empty itemCode', async () => {
      mockShopItemRepository.findOne.mockResolvedValue(null);

      await expect(service.buyItem('user-1', ''))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle special characters in itemCode', async () => {
      mockShopItemRepository.findOne.mockResolvedValue(null);

      await expect(service.buyItem('user-1', '<script>alert("xss")</script>'))
        .rejects.toThrow(BadRequestException);
    });
  });
});
