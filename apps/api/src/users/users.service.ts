import { Injectable, ConflictException, InternalServerErrorException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Neo4jService } from '../neo4j/neo4j.service';
import { DEFAULTS } from '../config/defaults';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private neo4jService: Neo4jService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, firstName, lastName, school } = createUserDto;

    // 1. Vérifier si l'utilisateur existe déjà (Postgres)
    const existingUser = await this.usersRepository.findOneBy({ email });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 2. Hasher le mot de passe
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Créer l'utilisateur dans Postgres
    const user = this.usersRepository.create({
      email,
      passwordHash,
      firstName,
      lastName,
      school,
    });

    let savedUser: User;
    try {
      savedUser = await this.usersRepository.save(user);
    } catch (error) {
      throw new InternalServerErrorException('Error saving to Relational DB');
    }

    // 4. Créer le nœud Utilisateur dans Neo4j (Sync)
    // On utilise l'ID généré par Postgres (UUID) comme identifiant unique dans le Graphe
    const cypher = `
      CREATE (u:User {
        id: $id,
        email: $email,
        firstName: $firstName,
        lastName: $lastName,
        school: $school,
        createdAt: datetime(),
        xp: 0
      })
      RETURN u
    `;

    try {
      const session = this.neo4jService.getWriteSession();
      await session.run(cypher, {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        school: savedUser.school,
      });
      session.close();
    } catch (error) {
      // Rollback: Si Neo4j échoue, on devrait idéalement supprimer l'user Postgres 
      // ou mettre en place un système de retry (Outbox pattern).
      // Pour ce MVP, on log l'erreur critique.
      this.logger.error('CRITICAL: Failed to create User node in Neo4j', error);
      // Rollback: Supprimer l'utilisateur de Postgres si Neo4j échoue
      await this.usersRepository.remove(savedUser);
      throw new InternalServerErrorException('Error synchronizing with Graph DB');
    }

    return savedUser;
  }

  async deleteUser(id: string) {
    const session = this.neo4jService.getWriteSession();
    try {
      // 1. Supprimer de Neo4j d'abord
      const cypher = `MATCH (u:User {id: $id}) DETACH DELETE u`;
      await session.run(cypher, { id });
      
      // 2. Supprimer de Postgres ensuite
      const result = await this.usersRepository.delete(id);
      
      this.logger.log(`User ${id} deleted successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete user ${id}: ${error.message}`);
      throw new InternalServerErrorException('Failed to delete user');
    } finally {
      await session.close();
    }
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async setBanStatus(id: string, isBanned: boolean): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new ConflictException('User not found');
    user.isBanned = isBanned;
    this.logger.log(`User ${id} ban status changed to: ${isBanned}`);
    return this.usersRepository.save(user);
  }

  async forceAdminUpdate(email: string, pass: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ email });
    if (!user) throw new ConflictException('User not found');
    
    const salt = await bcrypt.genSalt();
    user.passwordHash = await bcrypt.hash(pass, salt);
    user.role = 'ADMIN';
    
    this.logger.warn(`User ${email} force-updated to ADMIN role`);
    return this.usersRepository.save(user);
  }

  /**
   * Génère un mot de passe temporaire sécurisé
   * Utilise crypto.randomBytes pour une entropie cryptographique
   */
  private generateSecurePassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const bytes = crypto.randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset[bytes[i] % charset.length];
    }
    return password;
  }

  async manualResetPassword(id: string): Promise<string> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new ConflictException('User not found');
    
    // Utiliser un générateur de mot de passe sécurisé
    const tempPassword = this.generateSecurePassword(12);
    const salt = await bcrypt.genSalt();
    user.passwordHash = await bcrypt.hash(tempPassword, salt);
    
    await this.usersRepository.save(user);
    this.logger.log(`Password reset for user ${id}`);
    return tempPassword;
  }

  /**
   * Récupère le profil complet (Postgres + XP Neo4j + Calcul de niveau)
   */
  async getUserProfile(userId: string) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Récupérer l'XP depuis Neo4j
    const cypher = `
      MATCH (u:User {id: $userId})
      RETURN u.xp as xp
    `;
    const session = this.neo4jService.getReadSession();

    try {
      const result = await session.run(cypher, { userId });

      // Gestion robuste de l'XP (Neo4j Integer ou JS Number ou Null)
      let xp = 0;
      if (result.records.length > 0) {
        const xpField = result.records[0].get('xp');
        if (xpField !== null && xpField !== undefined) {
          xp = xpField.low !== undefined ? xpField.low : xpField;
        }
      }

      // Calculer la progression globale
      const progressCypher = `
        MATCH (s:Skill)
        WITH count(s) as total
        OPTIONAL MATCH (u:User {id: $userId})-[:MASTERED]->(m:Skill)
        RETURN total, count(m) as mastered
      `;
      const progressResult = await session.run(progressCypher, { userId });

      let totalSkills = 1;
      let masteredSkills = 0;

      if (progressResult.records.length > 0) {
        const record = progressResult.records[0];
        totalSkills = (record.get('total').low !== undefined ? record.get('total').low : record.get('total')) || 1;
        masteredSkills = (record.get('mastered').low !== undefined ? record.get('mastered').low : record.get('mastered')) || 0;
      }

      const globalProgress = Math.round((masteredSkills / totalSkills) * 100);

      // Calculer le niveau avec la constante configurable
      const multiplier = DEFAULTS.LEVEL_FORMULA_MULTIPLIER;
      const levelRaw = Math.sqrt(xp) * multiplier;
      const level = parseFloat(levelRaw.toFixed(2));

      // XP pour le prochain niveau entier
      const nextLevel = Math.floor(level) + 1;
      const xpForNextLevel = Math.pow(nextLevel / multiplier, 2);
      const xpForCurrentLevel = Math.pow(Math.floor(level) / multiplier, 2);

      // Pourcentage de la barre
      const progress = ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

      return {
        ...user,
        username: (user.firstName + user.lastName).toLowerCase().replace(/\s/g, ''),
        role: user.role,
        passwordHash: undefined, // Sécurité: ne jamais exposer le hash
        xp,
        level,
        progress: Math.min(100, Math.max(0, progress)),
        xpForNextLevel,
        globalProgress,
        masteredSkills,
        totalSkills
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Récupère le top 50 des utilisateurs par XP, filtré par école
   */
  async getLeaderboard(school?: string) {
    let cypher = `
      MATCH (u:User)
      WHERE u.xp IS NOT NULL
    `;
    
    if (school) {
        cypher += ` AND u.school = $school `;
    }

    cypher += `
      RETURN u.id as id, u.xp as xp
      ORDER BY u.xp DESC
      LIMIT 50
    `;

    try {
      const session = this.neo4jService.getReadSession();
      const result = await session.run(cypher, { school });
      session.close();

      const neo4jData = result.records.map(record => ({
        id: record.get('id'),
        xp: record.get('xp').low || record.get('xp'),
      }));

      if (neo4jData.length === 0) return [];

      // Filter out non-UUID IDs to avoid Postgres errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const userIds = neo4jData.filter(d => uuidRegex.test(d.id)).map(d => d.id);

      if (userIds.length === 0) return [];

      // Enrichir avec Postgres
      const users = await this.usersRepository.find({
        where: { id: In(userIds) },
        select: ['id', 'firstName', 'lastName', 'avatarUrl', 'coalition', 'school']
      });

      const userMap = new Map(users.map(u => [u.id, u]));

      return neo4jData.map(d => {
        const user = userMap.get(d.id);
        return {
          id: d.id,
          firstName: user?.firstName || 'Unknown',
          lastName: user?.lastName || 'User',
          username: user ? (user.firstName + user.lastName).toLowerCase().replace(/\s/g, '') : 'unknown',
          avatarUrl: user?.avatarUrl,
          xp: d.xp,
          coalition: user?.coalition || 'The Order',
          school: user?.school,
          level: Math.floor(Math.sqrt(d.xp) * 0.1)
        };
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Failed to fetch leaderboard');
    }
  }

  async searchUsers(query: string) {
    if (!query) return [];
    return this.usersRepository.find({
      where: [
        { firstName: ILike(`%${query}%`) },
        { lastName: ILike(`%${query}%`) },
        { coalition: ILike(`%${query}%`) }
      ],
      select: ['id', 'firstName', 'lastName', 'avatarUrl', 'coalition', 'role'], // Pas de passwordHash
      take: 20
    });
  }

  async updateProfile(userId: string, updateData: Partial<User>) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new ConflictException('User not found');

    // Sécurité : On ne permet de mettre à jour que certains champs ici
    if (updateData.avatarUrl) user.avatarUrl = updateData.avatarUrl;
    if (updateData.bio !== undefined) user.bio = updateData.bio;
    if (updateData.title !== undefined) user.title = updateData.title;
    if (updateData.nameColor !== undefined) user.nameColor = updateData.nameColor;
    if (updateData.avatarBorder !== undefined) user.avatarBorder = updateData.avatarBorder;

    return this.usersRepository.save(user);
  }

  async updateEvaluationPoints(userId: string, delta: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const newBalance = (user.evaluationPoints ?? 3) + delta;
    if (newBalance < 0) {
      throw new BadRequestException('Insufficient evaluation points');
    }

    user.evaluationPoints = newBalance;
    this.logger.log(`User ${userId} evaluation points updated by ${delta}. New balance: ${user.evaluationPoints}`);
    return this.usersRepository.save(user);
  }

  /**
   * Resynchronise tous les utilisateurs Postgres vers Neo4j.
   * Utile si le graphe a été effacé par erreur.
   */
  async syncUsersToGraph() {
    const users = await this.usersRepository.find();
    const session = this.neo4jService.getWriteSession();
    
    try {
        for (const user of users) {
             await session.run(`
                MERGE (u:User {id: $id})
                ON CREATE SET 
                    u.email = $email,
                    u.firstName = $firstName,
                    u.lastName = $lastName,
                    u.school = $school,
                    u.createdAt = datetime(),
                    u.xp = 0
                ON MATCH SET
                    u.email = $email,
                    u.firstName = $firstName,
                    u.lastName = $lastName,
                    u.school = $school
             `, {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                school: user.school || 'Unknown' // Fallback if null
             });
        }
    } finally {
        await session.close();
    }
  }
}
