import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import neo4j, { Driver, Session, Result, Integer } from 'neo4j-driver';
import { ConfigService } from '@nestjs/config';

/**
 * Utilitaire pour convertir les Integer Neo4j en number JavaScript
 */
export function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Integer) return value.toNumber();
  if (typeof value === 'object' && 'low' in value) {
    return value.low;
  }
  return Number(value) || 0;
}

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.driver = neo4j.driver(
      this.configService.get<string>('NEO4J_URI') || '',
      neo4j.auth.basic(
        this.configService.get<string>('NEO4J_USERNAME') || '',
        this.configService.get<string>('NEO4J_PASSWORD') || '',
      ),
    );
  }

  onModuleDestroy() {
    this.driver.close();
  }

  getReadSession(database?: string): Session {
    return this.driver.session({
      database: database || 'neo4j',
      defaultAccessMode: neo4j.session.READ,
    });
  }

  getWriteSession(database?: string): Session {
    return this.driver.session({
      database: database || 'neo4j',
      defaultAccessMode: neo4j.session.WRITE,
    });
  }

  /**
   * Exécute une requête en lecture avec gestion automatique de la session
   */
  async read<T>(cypher: string, params?: Record<string, any>): Promise<Result> {
    const session = this.getReadSession();
    try {
      return await session.run(cypher, params);
    } finally {
      await session.close();
    }
  }

  /**
   * Exécute une requête en écriture avec gestion automatique de la session
   */
  async write<T>(cypher: string, params?: Record<string, any>): Promise<Result> {
    const session = this.getWriteSession();
    try {
      return await session.run(cypher, params);
    } finally {
      await session.close();
    }
  }

  /**
   * Exécute plusieurs requêtes en écriture dans une même session (pour les transactions)
   */
  async writeMany(queries: Array<{ cypher: string; params?: Record<string, any> }>): Promise<any[]> {
    const session = this.getWriteSession();
    try {
      const results: any[] = [];
      for (const query of queries) {
        results.push(await session.run(query.cypher, query.params));
      }
      return results;
    } finally {
      await session.close();
    }
  }
}