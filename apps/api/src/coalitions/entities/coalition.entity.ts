import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('coalitions')
@Index(['name', 'school'], { unique: true })
export class Coalition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // ex: 'The Order', 'Syndicate', 'Alliance'

  @Column()
  color: string; // ex: 'blue', 'red', 'green' (ou hex)

  @Column({ default: 0 })
  score: number;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  school: string; // Optionnel: permet d'avoir des coalitions par école

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
