import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UploadsService } from './uploads.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Upload un fichier et l'associe à un nœud
   */
  @Post('node/:nodeId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'PROF')
  @UseInterceptors(FileInterceptor('file'))
  async uploadToNode(
    @Param('nodeId') nodeId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    const result = await this.uploadsService.attachFileToNode(nodeId, {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    return {
      success: true,
      message: 'Fichier uploadé avec succès',
      file: {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      allFiles: result.files,
    };
  }

  /**
   * Upload plusieurs fichiers et les associe à un nœud
   */
  @Post('node/:nodeId/multiple')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'PROF')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 fichiers
  async uploadMultipleToNode(
    @Param('nodeId') nodeId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    let result;
    for (const file of files) {
      result = await this.uploadsService.attachFileToNode(nodeId, {
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
    }

    return {
      success: true,
      message: `${files.length} fichier(s) uploadé(s) avec succès`,
      uploadedFiles: files.map(f => ({
        filename: f.filename,
        originalName: f.originalname,
      })),
      allFiles: result?.files || [],
    };
  }

  /**
   * Récupérer la liste des fichiers d'un nœud
   */
  @Get('node/:nodeId')
  @UseGuards(AuthGuard('jwt'))
  async getNodeFiles(@Param('nodeId') nodeId: string) {
    const files = await this.uploadsService.getNodeFiles(nodeId);
    return { files };
  }

  /**
   * Télécharger un fichier
   * Note: Endpoint public pour permettre l'affichage des images dans le contenu.
   * Les fichiers sont stockés avec des noms UUID, donc non devinables.
   */
  @Get('file/:filename')
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Validation du filename pour éviter path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Nom de fichier invalide');
    }
    
    if (!this.uploadsService.fileExists(filename)) {
      throw new NotFoundException('Fichier non trouvé');
    }

    const filePath = this.uploadsService.getFilePath(filename);
    return res.sendFile(filePath);
  }

  /**
   * Supprimer un fichier d'un nœud
   */
  @Delete('node/:nodeId/file/:filename')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'PROF')
  async removeFile(
    @Param('nodeId') nodeId: string,
    @Param('filename') filename: string,
  ) {
    const result = await this.uploadsService.removeFileFromNode(nodeId, filename);
    if (!result.success) {
      throw new NotFoundException(result.message);
    }
    return result;
  }
}
