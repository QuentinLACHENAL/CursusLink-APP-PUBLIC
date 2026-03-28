import { Controller, Post, Body, Get, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CorrectionsService } from './corrections.service';
import { RequestCorrectionDto, SubmitCorrectionDto } from './dto/correction.dto';

@Controller('corrections')
export class CorrectionsController {
  constructor(private readonly correctionsService: CorrectionsService) {}

  @Get('available/:userId')
  @UseGuards(AuthGuard('jwt'))
  findAvailable(@Param('userId') userId: string, @Request() req) {
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'PROF';
    return this.correctionsService.findAvailableCorrections(userId, isAdmin);
  }

  @Get('my-requests/:userId')
  @UseGuards(AuthGuard('jwt'))
  findMyRequests(@Param('userId') userId: string, @Request() req) {
    // Vérifier que l'utilisateur demande ses propres requêtes
    if (req.user.userId !== userId && req.user.role !== 'ADMIN' && req.user.role !== 'PROF') {
      throw new ForbiddenException('Vous ne pouvez voir que vos propres demandes');
    }
    return this.correctionsService.findMyRequests(userId);
  }

  @Get('given/:userId')
  @UseGuards(AuthGuard('jwt'))
  findGiven(@Param('userId') userId: string, @Request() req) {
    // Vérifier que l'utilisateur demande ses propres corrections
    if (req.user.userId !== userId && req.user.role !== 'ADMIN' && req.user.role !== 'PROF') {
      throw new ForbiddenException('Vous ne pouvez voir que vos propres corrections');
    }
    return this.correctionsService.findGivenCorrections(userId);
  }

  @Delete(':id/:userId')
  @UseGuards(AuthGuard('jwt'))
  cancel(@Param('id') id: string, @Param('userId') userId: string, @Request() req) {
    // Vérifier que l'utilisateur annule sa propre demande
    if (req.user.userId !== userId && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Vous ne pouvez annuler que vos propres demandes');
    }
    return this.correctionsService.cancelRequest(id, userId);
  }

  @Get('activity')
  @UseGuards(AuthGuard('jwt'))
  getActivity() {
    return this.correctionsService.getRecentActivity();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  getOne(@Param('id') id: string) {
    return this.correctionsService.findOne(id);
  }

  @Post('request')
  @UseGuards(AuthGuard('jwt'))
  async requestCorrection(
    @Body() dto: RequestCorrectionDto, 
    @Request() req
  ) {
    // SÉCURITÉ: Utiliser l'userId du token JWT, pas du body
    console.log('Request correction for project:', dto.projectId, 'by user:', req.user.userId);
    return this.correctionsService.requestCorrection(req.user.userId, dto.projectId, dto.submissionData);
  }

  @Post('submit')
  @UseGuards(AuthGuard('jwt'))
  submit(@Body() dto: SubmitCorrectionDto, @Request() req) {
    return this.correctionsService.submitCorrection(dto.correctionId, req.user, dto.mark, dto.comments);
  }
}