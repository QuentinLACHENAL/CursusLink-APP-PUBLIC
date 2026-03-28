import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ShopItem, ShopItemType } from './entities/shop-item.entity';

// Données initiales pour le seed (une seule fois)
const INITIAL_SHOP_ITEMS: Partial<ShopItem>[] = [
  // Titres
  { code: 'title_novice', name: 'Novice', description: 'Le début du voyage', type: 'title', value: 'Novice', price: 0, sortOrder: 1 },
  { code: 'title_padawan', name: 'Padawan', description: 'La force grandit', type: 'title', value: 'Padawan', price: 100, sortOrder: 2 },
  { code: 'title_coder', name: 'Codeur', description: 'Tu as écrit ton premier Hello World', type: 'title', value: 'Codeur', price: 200, sortOrder: 3 },
  { code: 'title_hacker', name: 'Hacker', description: 'Tu vois la matrice', type: 'title', value: 'Hacker', price: 1000, sortOrder: 4 },
  { code: 'title_guru', name: 'Guru', description: "L'illumination", type: 'title', value: 'Guru', price: 5000, sortOrder: 5 },

  // Couleurs de Pseudo (Tailwind Classes)
  { code: 'color_blue', name: 'Bleu Ciel', description: 'Apaisant comme un segfault', type: 'nameColor', value: 'text-sky-400', price: 150, sortOrder: 10 },
  { code: 'color_pink', name: 'Neon Pink', description: 'Cyberpunk style', type: 'nameColor', value: 'text-pink-500', price: 300, sortOrder: 11 },
  { code: 'color_gold', name: 'Légendaire', description: "Pour l'élite", type: 'nameColor', value: 'text-yellow-400 font-bold', price: 2000, sortOrder: 12 },
  { code: 'color_gradient', name: 'Arc-en-ciel', description: 'Pure classe', type: 'nameColor', value: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 font-bold', price: 5000, sortOrder: 13 },

  // Bordures Avatar
  { code: 'border_gold', name: 'Cadre Doré', description: 'Brille de mille feux', type: 'avatarBorder', value: 'border-4 border-yellow-500 shadow-yellow-500/50', price: 500, sortOrder: 20 },
  { code: 'border_neon', name: 'Cadre Néon', description: 'Futuriste', type: 'avatarBorder', value: 'border-4 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.7)]', price: 800, sortOrder: 21 },
  { code: 'border_fire', name: 'Cadre Enflammé', description: 'Chaud devant', type: 'avatarBorder', value: 'border-4 border-red-600 shadow-red-500/50 animate-pulse', price: 1500, sortOrder: 22 },
];

@Injectable()
export class ShopService implements OnModuleInit {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    @InjectRepository(ShopItem)
    private shopItemRepository: Repository<ShopItem>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.seedShopItems();
  }

  /**
   * Initialise les items du shop si la table est vide.
   * Utilise le code comme identifiant unique pour éviter les doublons.
   */
  private async seedShopItems() {
    const count = await this.shopItemRepository.count();
    if (count > 0) {
      this.logger.debug(`Shop already has ${count} items, skipping seed`);
      return;
    }

    this.logger.log('Seeding shop items...');
    for (const item of INITIAL_SHOP_ITEMS) {
      await this.shopItemRepository.save(this.shopItemRepository.create(item));
    }
    this.logger.log(`Seeded ${INITIAL_SHOP_ITEMS.length} shop items`);
  }

  /**
   * Retourne le catalogue des items actifs
   */
  async getCatalog(): Promise<ShopItem[]> {
    return this.shopItemRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', price: 'ASC' },
    });
  }

  /**
   * Retourne un item par son code
   */
  async getItemByCode(code: string): Promise<ShopItem | null> {
    return this.shopItemRepository.findOne({ where: { code } });
  }

  /**
   * Achète un item avec protection contre les race conditions
   * Utilise une transaction avec verrouillage pessimiste
   */
  async buyItem(userId: string, itemCode: string) {
    // Validation de l'item avant la transaction
    const item = await this.shopItemRepository.findOne({
      where: { code: itemCode, isActive: true }
    });
    if (!item) throw new BadRequestException('Item introuvable ou inactif');

    // Utiliser une transaction avec lock pessimiste pour éviter les race conditions
    return this.dataSource.transaction(async (manager) => {
      // Lock la ligne user pour cette transaction
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' }
      });

      if (!user) throw new BadRequestException('Utilisateur introuvable');

      // Vérifier si déjà possédé (on stocke le code dans l'inventaire)
      const inventory = user.inventory || [];
      if (inventory.includes(itemCode)) {
        throw new BadRequestException('Tu possèdes déjà cet objet !');
      }

      // Vérifier les fonds
      if (user.credits < item.price) {
        throw new BadRequestException(`Fonds insuffisants. Il te manque ${item.price - user.credits} crédits.`);
      }

      // Déduire les crédits et ajouter à l'inventaire
      user.credits -= item.price;
      user.inventory = [...inventory, itemCode];

      // Sauvegarde atomique dans la transaction
      await manager.save(user);

      this.logger.log(`User ${userId} bought item ${itemCode} for ${item.price} credits`);

      return {
        success: true,
        newCredits: user.credits,
        inventory: user.inventory,
        item: {
          code: item.code,
          name: item.name,
          type: item.type,
          value: item.value,
        }
      };
    });
  }

  /**
   * Ajouter un nouvel item au catalogue (admin)
   */
  async createItem(data: Partial<ShopItem>): Promise<ShopItem> {
    const existing = await this.shopItemRepository.findOne({ where: { code: data.code } });
    if (existing) {
      throw new BadRequestException(`Un item avec le code "${data.code}" existe déjà`);
    }
    return this.shopItemRepository.save(this.shopItemRepository.create(data));
  }

  /**
   * Modifier un item existant (admin)
   */
  async updateItem(code: string, data: Partial<ShopItem>): Promise<ShopItem> {
    const item = await this.shopItemRepository.findOne({ where: { code } });
    if (!item) {
      throw new BadRequestException(`Item avec le code "${code}" non trouvé`);
    }
    Object.assign(item, data);
    return this.shopItemRepository.save(item);
  }

  /**
   * Désactiver un item (soft delete)
   */
  async deactivateItem(code: string): Promise<ShopItem> {
    return this.updateItem(code, { isActive: false });
  }
}
