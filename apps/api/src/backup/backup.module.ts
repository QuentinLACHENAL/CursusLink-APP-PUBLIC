import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { Neo4jModule } from '../neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
