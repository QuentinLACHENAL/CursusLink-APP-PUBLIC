import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtre global pour capturer toutes les exceptions et les transformer
 * en réponses JSON standardisées.
 * 
 * Ce filtre :
 * - Log toutes les erreurs pour le debugging
 * - Masque les détails internes en production
 * - Fournit des messages d'erreur cohérents
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal Server Error';
    let error = 'Internal Server Error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      
      // Si la réponse est déjà un objet (ex: validation error), on l'utilise
      if (typeof responseBody === 'object') {
        const resObj = responseBody as any;
        message = resObj.message || resObj;
        error = resObj.error || error;
        
        // Préserver les détails de validation
        if (Array.isArray(resObj.message)) {
          details = resObj.message;
          message = 'Validation failed';
        }
      } else {
        message = responseBody;
      }
      
      // Log seulement les erreurs 5xx
      if (status >= 500) {
        this.logger.error(`HTTP ${status} ${request.method} ${request.url}: ${JSON.stringify(message)}`);
      } else if (status >= 400) {
        this.logger.warn(`HTTP ${status} ${request.method} ${request.url}: ${JSON.stringify(message)}`);
      }
    } else if (exception instanceof Error) {
      // Erreurs non-HTTP (DB, logique code...)
      this.logger.error(
        `Non-HTTP Error on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack
      );
      
      // Détection des erreurs Neo4j
      if (exception.message.includes('Neo4jError') || exception.message.includes('Neo4j')) {
        error = 'Database Error';
        message = this.isProduction 
          ? 'A database error occurred' 
          : exception.message;
      }
      
      // Détection des erreurs de contrainte
      if (exception.message.includes('constraint') || exception.message.includes('unique')) {
        status = HttpStatus.CONFLICT;
        error = 'Conflict';
        message = 'A record with this identifier already exists';
      }
      
      // En dev, on peut inclure le stack trace
      if (!this.isProduction && exception.stack) {
        details = exception.stack.split('\n').slice(0, 5);
      }
    }

    // Construire la réponse
    const errorResponse: Record<string, any> = {
      statusCode: status,
      message: message,
      error: error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    
    // Ajouter les détails seulement si disponibles
    if (details) {
      errorResponse.details = details;
    }

    response.status(status).json(errorResponse);
  }
}
