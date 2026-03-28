import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':key')
  async getValue(@Param('key') key: string) {
    const value = await this.settingsService.getValue(key);
    return { key, value };
  }

  @Post(':key')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async setValue(@Param('key') key: string, @Body('value') value: string) {
    return this.settingsService.setValue(key, value);
  }
}
