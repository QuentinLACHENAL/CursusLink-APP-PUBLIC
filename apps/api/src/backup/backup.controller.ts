import { Controller, Get, Post, Body, UseGuards, InternalServerErrorException } from '@nestjs/common';
import { BackupService } from './backup.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('export')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async exportFullGraph() {
    return this.backupService.exportFullGraph();
  }

  @Post('import')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async importFullGraph(@Body() data: any) {
    if (!data || !data.data || !data.data.nodes) throw new InternalServerErrorException("Structure invalide");
    return this.backupService.importFullGraph(data);
  }
}
