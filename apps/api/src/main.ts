import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { Neo4jTypeInterceptor } from './common/interceptors/neo4j-type.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn', 'log'] 
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  // Filtre Global pour les erreurs (Toujours renvoyer du JSON)
  app.useGlobalFilters(new AllExceptionsFilter());

  // Intercepteurs Globaux
  app.useGlobalInterceptors(
    new Neo4jTypeInterceptor(),  // Transforme les types Neo4j (Integers)
    new LoggingInterceptor(),    // Log les requêtes et mesure les performances
  );
  
  // Activer la validation globale des DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Supprime les propriétés non décorées
    forbidNonWhitelisted: true, // Rejette les requêtes avec des propriétés inconnues
    transform: true, // Transforme les payloads en instances de DTO
    transformOptions: {
      enableImplicitConversion: true, // Conversion automatique des types primitifs
    },
  }));
  
  // Activer CORS pour autoriser le frontend (localhost:3001)
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*', // En dev, on autorise tout. En prod, mettre l'URL du frontend.
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 CursusLink API running on port ${port}`);
  logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();
