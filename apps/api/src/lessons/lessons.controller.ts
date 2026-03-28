import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LessonsService } from './lessons.service';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get(':nodeId')
  findOne(@Param('nodeId') nodeId: string) {
    return this.lessonsService.findOne(nodeId);
  }

  @Post(':nodeId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  save(
    @Param('nodeId') nodeId: string,
    @Body() body: { title: string; content: string }
  ) {
    return this.lessonsService.save(nodeId, body.title, body.content);
  }
}
