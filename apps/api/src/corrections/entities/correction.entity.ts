import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum CorrectionStatus {
  PENDING = 'PENDING',       // En attente d'un correcteur
  IN_PROGRESS = 'IN_PROGRESS', // Correction en cours
  VALIDATED = 'VALIDATED',   // Projet réussi
  FAILED = 'FAILED'          // Projet raté
}

@Entity('corrections')
export class Correction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // L'étudiant qui a fait le projet
  @ManyToOne(() => User)
  student: User;

  @Column()
  studentId: string;

  // Le correcteur (peut être null tant que personne n'a accepté)
  @ManyToOne(() => User, { nullable: true })
  corrector: User;

  @Column({ nullable: true })
  correctorId: string;

  @Column()
  projectId: string; // Ex: 'proj-libft'

  @Column({ type: 'text', nullable: true })
  submissionData: string; // URL, Text, ou JSON de la réponse de l'étudiant

  @Column({
    type: 'enum',
    enum: CorrectionStatus,
    default: CorrectionStatus.PENDING
  })
  status: CorrectionStatus;

  @Column({ type: 'int', nullable: true })
  finalMark: number; // Note sur 100

  @Column({ type: 'text', nullable: true })
  comments: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
