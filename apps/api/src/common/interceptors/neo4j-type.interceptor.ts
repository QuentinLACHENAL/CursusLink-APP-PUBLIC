import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { isInt, isDate, isDateTime, isLocalDateTime, isTime, isLocalTime, isDuration } from 'neo4j-driver';

@Injectable()
export class Neo4jTypeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(data => this.transform(data)));
  }

  private transform(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Gestion des Entiers Neo4j (le cœur du problème)
    if (isInt(value)) {
      return value.toNumber();
    }
    
    // Fallback pour les objets {low, high} si isInt échoue (cas où le driver n'est pas utilisé directement mais sérialisé)
    if (typeof value === 'object' && value !== null && 'low' in value && 'high' in value && Object.keys(value).length === 2) {
        // C'est un Integer Neo4j sérialisé
        return value.low; // On prend la partie basse (suffisant pour < 2^53)
    }

    // Gestion des Dates Neo4j (Optionnel mais recommandé)
    if (isDate(value) || isDateTime(value) || isLocalDateTime(value) || isTime(value) || isLocalTime(value)) {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.map(item => this.transform(item));
    }

    if (typeof value === 'object') {
      const result: any = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          result[key] = this.transform(value[key]);
        }
      }
      return result;
    }

    return value;
  }
}
