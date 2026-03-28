import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { DEFAULTS } from '../config/defaults';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        // La validation est déjà faite dans env.validation.ts, mais double-check par sécurité
        if (!jwtSecret) {
          throw new Error('JWT_SECRET is required but not defined');
        }
        return {
          secret: jwtSecret,
          signOptions: { expiresIn: DEFAULTS.JWT_EXPIRATION },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}