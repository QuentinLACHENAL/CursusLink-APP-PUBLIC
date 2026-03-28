import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { ToggleBanDto, MaintenanceOperationDto } from './dto/admin.dto';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @Roles('ADMIN')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Post('users/:id/ban')
  @Roles('ADMIN')
  banUser(@Param('id') id: string, @Body() dto: ToggleBanDto) {
    return this.adminService.toggleBan(id, dto.isBanned);
  }

  @Post('users/:id/reset-password')
  @Roles('ADMIN')
  resetPassword(@Param('id') id: string) {
    return this.adminService.resetUserPassword(id);
  }

  @Get('corrections')
  @Roles('ADMIN')
  getAllCorrections() {
    return this.adminService.getAllCorrections();
  }

  @Delete('users/:id')
  @Roles('ADMIN')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('structure')
  getStructure() {
    return this.adminService.getStructure();
  }

  @Post('maintenance/repair-labels')
  @Roles('ADMIN')
  repairLabels() {
    return this.adminService.repairLabels();
  }

  @Post('maintenance/cleanup-orphans')
  @Roles('ADMIN')
  cleanupOrphanedExercises() {
    return this.adminService.cleanupOrphanedExercises();
  }

  @Post('maintenance/migrate-exercises')
  @Roles('ADMIN')
  migrateExercises() {
    return this.adminService.migrateExercises();
  }

  @Get('maintenance/health')
  @Roles('ADMIN')
  getHealthReport() {
    return this.adminService.getDataIntegrityReport();
  }
}
