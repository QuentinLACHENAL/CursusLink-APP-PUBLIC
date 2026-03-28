import { Module } from '@nestjs/common';
import { GraphService } from './graph.service';
import { GraphController } from './graph.controller';
import { GraphCrudService } from './services/graph-crud.service';
import { GraphQueryService } from './services/graph-query.service';
import { GraphSeederService } from './services/graph-seeder.service';

@Module({
  controllers: [GraphController],
  providers: [
    GraphService,
    GraphCrudService,
    GraphQueryService,
    GraphSeederService
  ],
  exports: [GraphService, GraphCrudService, GraphQueryService], 
})
export class GraphModule {}