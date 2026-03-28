import { Controller, Get, Post, Delete, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GraphService } from './graph.service';
import { CreateNodeDto, UpdateNodeDto, CreateRelationshipDto, ValidateSkillDto, UpdatePositionsDto, UpdateExerciseDto } from './dto/graph.dto';

@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Post('seed')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  seed() {
    return this.graphService.seed();
  }

  @Post('reset')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  reset() {
    return this.graphService.resetGraph();
  }

  @Get()
  getGraph(@Query('userId') userId?: string) {
    return this.graphService.getGraph(userId);
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'PROF')
  getStats() {
    return this.graphService.getStats();
  }

  @Get('node/:id')
  getNodeById(@Param('id') id: string) {
    return this.graphService.getNodeById(id);
  }

  @Post('validate')
  @UseGuards(AuthGuard('jwt'))
  validate(@Body() dto: ValidateSkillDto, @Request() req) {
    // Utilise l'userId du token JWT, pas du body (sécurité)
    return this.graphService.validateSkill(req.user.userId, dto.skillId, dto.xp || 100);
  }

  // --- ADMIN ENDPOINTS ---

  @Post('node')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'PROF')
  createNode(@Body() dto: CreateNodeDto) {
    return this.graphService.createNode(dto);
  }

  @Patch('node/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'PROF')
  updateNode(@Param('id') id: string, @Body() dto: UpdateNodeDto) {
    return this.graphService.updateNode(id, dto);
  }

  @Delete('node/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  deleteNode(@Param('id') id: string) {
    return this.graphService.deleteNode(id);
  }

  @Delete('galaxy/:name')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  deleteGalaxy(@Param('name') name: string) {
    return this.graphService.deleteGalaxy(name);
  }

  @Delete('system/:galaxy/:system')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  deleteSystem(
    @Param('galaxy') galaxy: string,
    @Param('system') system: string
  ) {
    return this.graphService.deleteSystem(galaxy, system);
  }

  @Post('relationship')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'PROF')
  createRelationship(@Body() dto: CreateRelationshipDto) {
    return this.graphService.createRelationship(dto.source, dto.target, dto.type);
  }

  @Post('positions')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'PROF')
  updatePositions(@Body() dto: UpdatePositionsDto) {
    return this.graphService.updatePositions(dto.positions);
  }

  @Post('reset-positions')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  resetPositions() {
    return this.graphService.resetPositions();
  }

  @Delete('relationship/:sourceId/:targetId/:type')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  deleteRelationship(
    @Param('sourceId') sourceId: string,
    @Param('targetId') targetId: string,
    @Param('type') type: string
  ) {
    return this.graphService.deleteRelationship(sourceId, targetId, type);
  }

  @Post('migrate-groups')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  migrateGroups() {
    return this.graphService.migrateGroups();
  }

  @Post('migrate-exercises')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  migrateExercises() {
    return this.graphService.migrateExercisesToNodes();
  }

  // --- EXERCISE ENDPOINTS ---

  @Patch('node/:id/exercise')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'PROF')
  updateNodeExercise(@Param('id') id: string, @Body() dto: UpdateExerciseDto) {
    return this.graphService.updateNodeExercise(id, dto.exerciseType, dto.exerciseData || '');
  }

  @Get('node/:id/exercise')
  getNodeExercise(@Param('id') id: string) {
    return this.graphService.getNodeExercise(id);
  }

  @Get('structure')
  @UseGuards(AuthGuard('jwt')) // Accessible aux profs aussi
  getStructure() {
    return this.graphService.getGalaxyStructure();
  }
}