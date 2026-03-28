import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { Neo4jModule } from '../neo4j/neo4j.module';

// Créer le dossier uploads s'il n'existe pas
const uploadDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

@Module({
  imports: [
    Neo4jModule,
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          // Générer un nom unique : timestamp_original
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const baseName = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '_');
          cb(null, `${uniqueSuffix}_${baseName}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Autoriser PDF, DOC, DOCX, images (y compris WebP)
        const allowedMimes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Type de fichier non autorisé. Formats acceptés: PDF, DOC, DOCX, JPG, PNG, GIF, WebP, SVG'), false);
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB max
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
