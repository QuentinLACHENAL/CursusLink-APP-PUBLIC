import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalSetting } from './entities/global-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(GlobalSetting)
    private settingsRepository: Repository<GlobalSetting>,
  ) {}

  async getValue(key: string): Promise<string | null> {
    const setting = await this.settingsRepository.findOneBy({ key });
    return setting ? setting.value : null;
  }

  async setValue(key: string, value: string): Promise<GlobalSetting> {
    // Utiliser upsert pour éviter les doublons
    let setting = await this.settingsRepository.findOneBy({ key });
    
    if (setting) {
      setting.value = value;
    } else {
      setting = this.settingsRepository.create({ key, value });
    }
    
    return this.settingsRepository.save(setting);
  }

  async getAll(): Promise<GlobalSetting[]> {
    return this.settingsRepository.find();
  }

  async delete(key: string): Promise<void> {
    await this.settingsRepository.delete({ key });
  }
}
