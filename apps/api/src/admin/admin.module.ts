import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { CorrectionsModule } from '../corrections/corrections.module';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [UsersModule, CorrectionsModule, GraphModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
