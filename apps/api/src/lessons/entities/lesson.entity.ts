import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('lessons')
export class Lesson {
  @PrimaryColumn()
  nodeId: string; // L'ID du skill dans Neo4j (ex: "epaule_osteo")

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  content: string; // Markdown content

  @UpdateDateColumn()
  updatedAt: Date;
}
