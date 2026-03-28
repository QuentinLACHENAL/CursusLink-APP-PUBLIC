import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Neo4jModule } from './neo4j/neo4j.module';
import { UsersModule } from './users/users.module';
import { GraphModule } from './graph/graph.module';
import { CorrectionsModule } from './corrections/corrections.module';
import { ChatGateway } from './chat/chat.gateway';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { LessonsModule } from './lessons/lessons.module';
import { CoalitionsModule } from './coalitions/coalitions.module';
import { ShopModule } from './shop/shop.module';
import { SettingsModule } from './settings/settings.module';
import { BackupModule } from './backup/backup.module';
import { UploadsModule } from './uploads/uploads.module';
import { ExercisesModule } from './exercises/exercises.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        // SECURITE: synchronize désactivé en production pour éviter les pertes de données
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    Neo4jModule,
    UsersModule,
    GraphModule,
    CorrectionsModule,
    AuthModule,
    AdminModule,
    LessonsModule,
    CoalitionsModule,
    ShopModule,
    SettingsModule,
    BackupModule,
    UploadsModule,
    ExercisesModule,
  ],
  controllers: [AppController],
  providers: [AppService, ChatGateway],
})
export class AppModule {}