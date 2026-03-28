import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Intercepteur pour logger les requêtes et mesurer leur durée.
 * Utile pour identifier les endpoints lents et monitorer l'API.
 * 
 * Active uniquement en dev ou si LOG_REQUESTS=true
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly isEnabled = process.env.LOG_REQUESTS === 'true' || process.env.NODE_ENV !== 'production';
  private readonly slowThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000', 10);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.isEnabled) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const userAgent = request.get('user-agent') || '';
    const userId = request.user?.userId || 'anonymous';
    
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          
          // Format du log
          const logMessage = `[${requestId}] ${method} ${url} ${statusCode} - ${duration}ms - User: ${userId}`;
          
          // Warning si la requête est lente
          if (duration > this.slowThreshold) {
            this.logger.warn(`⚠️ SLOW REQUEST: ${logMessage}`);
          } else {
            this.logger.log(logMessage);
          }
          
          // Log détaillé pour les mutations
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            const bodyStr = JSON.stringify(body) || '';
            this.logger.debug(`[${requestId}] Body: ${bodyStr.substring(0, 500)}`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `[${requestId}] ${method} ${url} ERROR - ${duration}ms - User: ${userId} - ${error.message}`
          );
        },
      }),
    );
  }
}
