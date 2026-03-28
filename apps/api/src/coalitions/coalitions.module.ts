import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoalitionsService } from './coalitions.service';
import { CoalitionsController } from './coalitions.controller';
import { Coalition } from './entities/coalition.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Coalition])],
  controllers: [CoalitionsController],
  providers: [CoalitionsService],
  exports: [CoalitionsService],
})
export class CoalitionsModule {}
