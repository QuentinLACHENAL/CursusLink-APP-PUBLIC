import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, MinLength, IsIn, validateSync } from 'class-validator';

/**
 * Validation des variables d'environnement au démarrage.
 * L'application ne démarrera pas si les variables critiques sont manquantes ou invalides.
 */
export class EnvironmentVariables {
  // PostgreSQL
  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  @MinLength(8, { message: 'DB_PASSWORD must be at least 8 characters' })
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  // Neo4j
  @IsString()
  NEO4J_URI: string;

  @IsString()
  NEO4J_USERNAME: string;

  @IsString()
  @MinLength(8, { message: 'NEO4J_PASSWORD must be at least 8 characters' })
  NEO4J_PASSWORD: string;

  // JWT - CRITIQUE
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters for security' })
  JWT_SECRET: string;

  // Application
  @IsNumber()
  @IsOptional()
  PORT?: number = 3000;

  @IsString()
  @IsIn(['development', 'production', 'test'])
  @IsOptional()
  NODE_ENV?: string = 'development';

  // CORS
  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string = '*';

  // Redis (optionnel)
  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT?: number;
}

/**
 * Fonction de validation appelée par ConfigModule.
 * Lance une erreur explicite si la configuration est invalide.
 */
export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(err => {
      const constraints = err.constraints ? Object.values(err.constraints).join(', ') : 'Invalid value';
      return `  - ${err.property}: ${constraints}`;
    }).join('\n');

    throw new Error(
      `\n\n` +
      `========================================\n` +
      `  CONFIGURATION ERROR - Cannot start!\n` +
      `========================================\n\n` +
      `The following environment variables are missing or invalid:\n\n` +
      `${errorMessages}\n\n` +
      `Please check your .env file or environment variables.\n` +
      `See apps/api/.env.example for required variables.\n\n`
    );
  }

  return validatedConfig;
}
