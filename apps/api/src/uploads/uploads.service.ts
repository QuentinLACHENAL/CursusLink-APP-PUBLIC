import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class UploadsService {
  constructor(private readonly neo4jService: Neo4jService) {}

  /**
   * Associer un fichier à un nœud existant
   */
  async attachFileToNode(nodeId: string, fileInfo: {
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
  }) {
    const session = this.neo4jService.getWriteSession();
    try {
      // Récupérer les fichiers existants du nœud
      const existingResult = await session.run(
        'MATCH (n {id: $nodeId}) RETURN n.attachedFiles as files',
        { nodeId }
      );
      
      let existingFiles: any[] = [];
      if (existingResult.records.length > 0) {
        const filesStr = existingResult.records[0].get('files');
        if (filesStr) {
          try {
            existingFiles = JSON.parse(filesStr);
          } catch (e) {
            existingFiles = [];
          }
        }
      }
      
      // Ajouter le nouveau fichier
      existingFiles.push({
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        mimetype: fileInfo.mimetype,
        size: fileInfo.size,
        uploadedAt: new Date().toISOString()
      });
      
      // Mettre à jour le nœud
      await session.run(
        'MATCH (n {id: $nodeId}) SET n.attachedFiles = $files RETURN n',
        { nodeId, files: JSON.stringify(existingFiles) }
      );
      
      return { success: true, files: existingFiles };
    } finally {
      session.close();
    }
  }

  /**
   * Récupérer les fichiers d'un nœud
   */
  async getNodeFiles(nodeId: string) {
    const session = this.neo4jService.getReadSession();
    try {
      const result = await session.run(
        'MATCH (n {id: $nodeId}) RETURN n.attachedFiles as files',
        { nodeId }
      );
      
      if (result.records.length === 0) {
        return [];
      }
      
      const filesStr = result.records[0].get('files');
      if (!filesStr) return [];
      
      try {
        return JSON.parse(filesStr);
      } catch (e) {
        return [];
      }
    } finally {
      session.close();
    }
  }

  /**
   * Supprimer un fichier d'un nœud
   */
  async removeFileFromNode(nodeId: string, filename: string) {
    const session = this.neo4jService.getWriteSession();
    try {
      // Récupérer les fichiers existants
      const existingResult = await session.run(
        'MATCH (n {id: $nodeId}) RETURN n.attachedFiles as files',
        { nodeId }
      );
      
      if (existingResult.records.length === 0) {
        return { success: false, message: 'Nœud non trouvé' };
      }
      
      const filesStr = existingResult.records[0].get('files');
      let existingFiles: any[] = [];
      if (filesStr) {
        try {
          existingFiles = JSON.parse(filesStr);
        } catch (e) {
          existingFiles = [];
        }
      }
      
      // Trouver et supprimer le fichier
      const fileToRemove = existingFiles.find(f => f.filename === filename);
      if (!fileToRemove) {
        return { success: false, message: 'Fichier non trouvé' };
      }
      
      // Supprimer le fichier physique
      const filePath = join(process.cwd(), 'uploads', filename);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
      
      // Mettre à jour la liste
      const newFiles = existingFiles.filter(f => f.filename !== filename);
      
      await session.run(
        'MATCH (n {id: $nodeId}) SET n.attachedFiles = $files RETURN n',
        { nodeId, files: JSON.stringify(newFiles) }
      );
      
      return { success: true, files: newFiles };
    } finally {
      session.close();
    }
  }

  /**
   * Vérifier si un fichier existe (avec protection path traversal)
   */
  fileExists(filename: string): boolean {
    // Protection contre path traversal
    if (this.isPathTraversal(filename)) {
      return false;
    }
    const filePath = join(process.cwd(), 'uploads', filename);
    return existsSync(filePath);
  }

  /**
   * Obtenir le chemin complet d'un fichier (avec protection path traversal)
   */
  getFilePath(filename: string): string {
    // Protection contre path traversal
    if (this.isPathTraversal(filename)) {
      throw new Error('Invalid filename');
    }
    return join(process.cwd(), 'uploads', filename);
  }

  /**
   * Vérifie si le filename contient des patterns de path traversal
   */
  private isPathTraversal(filename: string): boolean {
    return filename.includes('..') || 
           filename.includes('/') || 
           filename.includes('\\') ||
           filename.startsWith('.');
  }
}
