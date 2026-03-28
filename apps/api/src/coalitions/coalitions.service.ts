import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coalition } from './entities/coalition.entity';
import { Neo4jService } from '../neo4j/neo4j.service';

// Coalitions par défaut (globales, pas liées à une école)
const DEFAULT_COALITIONS = [
  { name: 'The Order', color: '#3b82f6', logoUrl: '/img/order.png' },
  { name: 'Syndicate', color: '#ef4444', logoUrl: '/img/syndicate.png' },
  { name: 'Alliance', color: '#22c55e', logoUrl: '/img/alliance.png' },
];

@Injectable()
export class CoalitionsService {
  private readonly logger = new Logger(CoalitionsService.name);

  constructor(
    @InjectRepository(Coalition)
    private coalitionRepository: Repository<Coalition>,
    private neo4jService: Neo4jService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultCoalitions();
  }

  /**
   * Initialise les coalitions par défaut si aucune n'existe.
   * Ces coalitions sont globales (school = null).
   */
  private async seedDefaultCoalitions() {
    const count = await this.coalitionRepository.count();
    if (count > 0) {
      this.logger.debug(`Found ${count} coalitions, skipping seed`);
      return;
    }

    this.logger.log('Seeding default coalitions...');
    for (const coalition of DEFAULT_COALITIONS) {
      await this.coalitionRepository.save(
        this.coalitionRepository.create({
          ...coalition,
          score: 0,
          school: undefined, // Global (pas d'école spécifique)
          isActive: true,
        })
      );
    }
    this.logger.log(`Seeded ${DEFAULT_COALITIONS.length} default coalitions`);
  }

  // Score global (fallback)
  findAll() {
    return this.coalitionRepository.find({ order: { score: 'DESC' } });
  }

  // Score par école (Live Aggregation)
  async findBySchool(school: string) {
    if (!school) return this.findAll();

    const cypher = `
      MATCH (u:User {school: $school})
      RETURN u.coalition as name, sum(u.xp) as score
      ORDER BY score DESC
    `;
    
    const session = this.neo4jService.getReadSession();
    const result = await session.run(cypher, { school });
    session.close();

    const liveScores = result.records.map(r => ({
        name: r.get('name'),
        score: r.get('score').low || r.get('score')
    }));

    // On fusionne avec les métadonnées statiques (couleur, logo)
    const metadata = await this.coalitionRepository.find();
    
    return metadata.map(meta => {
        const live = liveScores.find(l => l.name === meta.name);
        return { ...meta, score: live ? live.score : 0 };
    }).sort((a, b) => b.score - a.score);
  }

  async addPoints(coalitionName: string, points: number) {
    // Legacy: on garde le score global pour l'histoire
    const coalition = await this.coalitionRepository.findOneBy({ name: coalitionName });
    if (coalition) {
      coalition.score += points;
      await this.coalitionRepository.save(coalition);
    }
  }
}
