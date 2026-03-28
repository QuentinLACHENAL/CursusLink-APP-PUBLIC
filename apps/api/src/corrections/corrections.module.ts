import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorrectionsService } from './corrections.service';
import { CorrectionsController } from './corrections.controller';
import { Correction } from './entities/correction.entity';
import { GraphModule } from '../graph/graph.module';
import { CoalitionsModule } from '../coalitions/coalitions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Correction]),
    GraphModule,
    CoalitionsModule,
    UsersModule
  ],
  controllers: [CorrectionsController],
  providers: [CorrectionsService],
  exports: [CorrectionsService]
})
export class CorrectionsModule {}