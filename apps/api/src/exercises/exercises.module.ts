import { Module } from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { GraphModule } from '../graph/graph.module'; // Pour GraphCrudService

@Module({
  imports: [Neo4jModule, GraphModule],
  controllers: [ExercisesController],
  providers: [ExercisesService],
})
export class ExercisesModule {}
