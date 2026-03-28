import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  // --- Nouveaux champs pour le profil ---
  
  @Column({ type: 'text', nullable: true, default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' })
  avatarUrl: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ default: 0 })
  credits: number; // Monnaie pour le shop

  // Inventaire simplifié : liste des IDs des items achetés (JSON)
  @Column({ type: 'json', default: [] })
  inventory: string[];

  // Cosmétiques équipés
  @Column({ nullable: true })
  title: string; // Ex: "Padawan"

  @Column({ nullable: true })
  nameColor: string; // Ex: "text-purple-400"

  @Column({ nullable: true })
  avatarBorder: string; // Ex: "border-gold-500"

  @Column({ default: 'The Order' }) // Ex: 'The Order', 'Cyber-Syndicate', 'Data-Mages'
  coalition: string;

  @Column({ default: 3 })
  evaluationPoints: number;

  @Column({ default: 'STUDENT' }) // 'STUDENT', 'STAFF', 'ADMIN'
  role: string;

  @Column({ nullable: true })
  school: string; // Ex: 'ISRP - Metz'

  @Column({ default: false })
  isBanned: boolean;

  // --------------------------------------

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}