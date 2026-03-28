import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExercisesService } from './exercises.service';
import { SubmitExerciseDto } from './dto/submit-exercise.dto';

@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post('verify')
  @UseGuards(AuthGuard('jwt'))
  verify(@Body() dto: SubmitExerciseDto, @Request() req) {
    return this.exercisesService.submitQCM(req.user.userId, dto);
  }
}
