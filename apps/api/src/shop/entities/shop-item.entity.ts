import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ShopItemType = 'title' | 'nameColor' | 'avatarBorder';

@Entity('shop_items')
export class ShopItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string; // Identifiant unique lisible (ex: 'title_novice')

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ type: 'varchar', length: 20 })
  type: ShopItemType;

  @Column()
  value: string; // La classe CSS ou le texte du titre

  @Column({ type: 'int' })
  price: number;

  @Column({ nullable: true })
  icon: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
