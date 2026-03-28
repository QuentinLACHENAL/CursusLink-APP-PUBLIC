import { Controller, Post, Body, Get, Param, Query, Patch, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('sync')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  syncUsers() {
    return this.usersService.syncUsersToGraph();
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(@Request() req, @Body() body: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, body);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'STAFF')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  @UseGuards(AuthGuard('jwt'))
  search(@Query('q') query: string) {
    return this.usersService.searchUsers(query);
  }

  @Get('profile/:id')
  getProfile(@Param('id') id: string) {
    return this.usersService.getUserProfile(id);
  }

  @Get('public-profile/:id')
  getPublicProfile(@Param('id') id: string) {
    // Note: C'est le même service mais on pourrait filtrer les données sensibles ici si besoin
    return this.usersService.getUserProfile(id);
  }

  @Get('leaderboard')
  getLeaderboard(@Query('school') school?: string) {
    return this.usersService.getLeaderboard(school);
  }

  @Patch(':id/evaluation-points')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'STAFF')
  updateEvaluationPoints(@Param('id') id: string, @Body('delta') delta: number) {
    return this.usersService.updateEvaluationPoints(id, delta);
  }
}