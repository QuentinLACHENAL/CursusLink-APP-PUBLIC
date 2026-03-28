import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('global_settings')
export class GlobalSetting {
  @PrimaryColumn()
  key: string;

  @Column()
  value: string;
}
