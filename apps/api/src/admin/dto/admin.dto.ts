import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO pour le ban/unban d'utilisateur
 */
export class ToggleBanDto {
  @IsBoolean({ message: 'isBanned doit être un booléen' })
  isBanned: boolean;
}

/**
 * DTO pour la suppression d'utilisateur
 * Peut être étendu pour inclure une confirmation ou raison
 */
export class DeleteUserDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * DTO pour les opérations de maintenance
 */
export class MaintenanceOperationDto {
  @IsBoolean()
  @IsOptional()
  dryRun?: boolean; // Si true, ne fait que compter sans modifier
}
