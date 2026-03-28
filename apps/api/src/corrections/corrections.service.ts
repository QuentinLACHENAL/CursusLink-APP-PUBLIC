import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Correction, CorrectionStatus } from './entities/correction.entity';
import { GraphService } from '../graph/graph.service';
import { CoalitionsService } from '../coalitions/coalitions.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class CorrectionsService {
  constructor(
    @InjectRepository(Correction)
    private correctionsRepository: Repository<Correction>,
    private graphService: GraphService,
    private coalitionsService: CoalitionsService,
    private usersService: UsersService,
  ) {}

  /**
   * Un étudiant demande une correction pour un projet
   */
  async requestCorrection(studentId: string, projectId: string, submissionData?: string) {
    console.log('requestCorrection called:', { studentId, projectId, submissionData });
    
    // Vérifier s'il n'y a pas déjà une correction en cours
    const existing = await this.correctionsRepository.findOne({
      where: { 
        studentId, 
        projectId, 
        status: CorrectionStatus.PENDING 
      }
    });

    if (existing) {
      console.log('Existing correction found:', existing.id);
      throw new BadRequestException('Une demande de correction est déjà en cours pour ce projet.');
    }

    // Deduct evaluation point
    await this.usersService.updateEvaluationPoints(studentId, -1);

    const correction = this.correctionsRepository.create({
      studentId,
      projectId,
      submissionData,
      status: CorrectionStatus.PENDING
    });

    const saved = await this.correctionsRepository.save(correction);
    console.log('Correction created successfully:', saved.id);
    return saved;
  }

  /**
   * Liste des corrections disponibles (pour trouver quelqu'un à corriger)
   */
  async findAvailableCorrections(userId: string, isAdmin: boolean = false) {
    const qb = this.correctionsRepository.createQueryBuilder('correction')
      .leftJoinAndSelect('correction.student', 'student')
      .where('correction.status = :status', { status: CorrectionStatus.PENDING });

    // Les admins voient tout, les étudiants ne voient pas leurs propres demandes
    if (!isAdmin) {
        qb.andWhere('correction.studentId != :userId', { userId });
    }

    const results = await qb.getMany();

    // Filtrer les projets supprimés et enrichir avec les labels lisibles
    const validResults: any[] = [];
    for (const correction of results) {
        const node = await this.graphService.getNodeById(correction.projectId);
        if (node) {
            validResults.push({
                id: correction.id,
                projectId: correction.projectId,
                projectLabel: this.getReadableProjectLabel(node, correction.projectId),
                status: correction.status,
                studentId: correction.studentId,
                student: correction.student ? {
                    id: correction.student.id,
                    firstName: correction.student.firstName,
                    lastName: correction.student.lastName,
                    avatarUrl: correction.student.avatarUrl,
                    coalition: correction.student.coalition
                } : null,
                createdAt: correction.createdAt?.toISOString?.() || correction.createdAt,
                updatedAt: correction.updatedAt?.toISOString?.() || correction.updatedAt
            });
        }
    }

    console.log(`findAvailableCorrections called: userId=${userId}, isAdmin=${isAdmin}, found=${validResults.length}`);
    return validResults;
  }

  async findMyRequests(userId: string) {
    const results = await this.correctionsRepository.find({
        where: { studentId: userId },
        relations: ['corrector'],
        order: { createdAt: 'DESC' }
    });

    const validResults: any[] = [];
    for (const correction of results) {
        const node = await this.graphService.getNodeById(correction.projectId);

        // Construire un objet avec tous les champs explicitement
        validResults.push({
            id: correction.id,
            projectId: correction.projectId,
            projectLabel: this.getReadableProjectLabel(node, correction.projectId),
            status: correction.status,
            finalMark: correction.finalMark,
            comments: correction.comments,
            submissionData: correction.submissionData,
            // Inclure explicitement correctorId
            correctorId: correction.correctorId,
            corrector: correction.corrector ? {
                id: correction.corrector.id,
                firstName: correction.corrector.firstName,
                lastName: correction.corrector.lastName,
                avatarUrl: correction.corrector.avatarUrl,
                role: correction.corrector.role
            } : null,
            // Formater les dates en ISO string pour être sûr
            createdAt: correction.createdAt?.toISOString?.() || correction.createdAt,
            updatedAt: correction.updatedAt?.toISOString?.() || correction.updatedAt
        });
    }

    return validResults;
  }

  async findGivenCorrections(userId: string) {
    const results = await this.correctionsRepository.find({
        where: { correctorId: userId },
        relations: ['student'],
        order: { updatedAt: 'DESC' }
    });

    const validResults: any[] = [];
    for (const correction of results) {
        const node = await this.graphService.getNodeById(correction.projectId);

        validResults.push({
            id: correction.id,
            projectId: correction.projectId,
            projectLabel: this.getReadableProjectLabel(node, correction.projectId),
            status: correction.status,
            finalMark: correction.finalMark,
            comments: correction.comments,
            submissionData: correction.submissionData,
            studentId: correction.studentId,
            student: correction.student ? {
                id: correction.student.id,
                firstName: correction.student.firstName,
                lastName: correction.student.lastName,
                avatarUrl: correction.student.avatarUrl
            } : null,
            createdAt: correction.createdAt?.toISOString?.() || correction.createdAt,
            updatedAt: correction.updatedAt?.toISOString?.() || correction.updatedAt
        });
    }

    return validResults;
  }

  async cancelRequest(id: string, userId: string) {
    const correction = await this.correctionsRepository.findOne({ where: { id } });
    if (!correction) throw new NotFoundException('Correction introuvable');
    if (correction.studentId !== userId) throw new BadRequestException('Vous ne pouvez annuler que vos propres demandes');
    if (correction.status !== CorrectionStatus.PENDING) throw new BadRequestException('Impossible d\'annuler une correction déjà commencée ou terminée');

    await this.usersService.updateEvaluationPoints(userId, 1);

    return this.correctionsRepository.remove(correction);
  }

  async findOne(id: string) {
    const correction = await this.correctionsRepository.findOne({
        where: { id },
        relations: ['student', 'corrector']
    });
    if (!correction) throw new NotFoundException('Correction non trouvée');

    // Enrichir avec les données du Graph (Neo4j)
    const nodeData = await this.graphService.getNodeById(correction.projectId);

    return {
        id: correction.id,
        projectId: correction.projectId,
        projectLabel: this.getReadableProjectLabel(nodeData, correction.projectId),
        status: correction.status,
        finalMark: correction.finalMark,
        comments: correction.comments,
        submissionData: correction.submissionData,
        studentId: correction.studentId,
        student: correction.student ? {
            id: correction.student.id,
            firstName: correction.student.firstName,
            lastName: correction.student.lastName,
            avatarUrl: correction.student.avatarUrl
        } : null,
        correctorId: correction.correctorId,
        corrector: correction.corrector ? {
            id: correction.corrector.id,
            firstName: correction.corrector.firstName,
            lastName: correction.corrector.lastName,
            avatarUrl: correction.corrector.avatarUrl,
            role: correction.corrector.role
        } : null,
        createdAt: correction.createdAt?.toISOString?.() || correction.createdAt,
        updatedAt: correction.updatedAt?.toISOString?.() || correction.updatedAt,
        projectDetails: nodeData || {}
    };
  }

  /**
   * Le correcteur note le projet
   */
  async submitCorrection(correctionId: string, corrector: any, mark: number, comments?: string) {
    console.log(`submitCorrection called: id=${correctionId}, corrector=${corrector.id}, role=${corrector.role}, mark=${mark}`);
    
    const correction = await this.correctionsRepository.findOne({ 
        where: { id: correctionId },
        relations: ['student'] 
    });
    
    if (!correction) {
        console.error('Correction not found:', correctionId);
        throw new NotFoundException('Correction introuvable');
    }
    
    if (correction.status !== CorrectionStatus.PENDING && correction.status !== CorrectionStatus.IN_PROGRESS) {
      console.error('Correction status invalid:', correction.status);
      throw new BadRequestException('Cette correction est déjà clôturée.');
    }

    // Empêcher l'auto-correction (sauf Admin/Prof)
    if (correction.studentId === corrector.id) {
      const isAdmin = corrector.role === 'ADMIN' || corrector.role === 'PROF';
      console.log('Self-correction attempt. Is Admin?', isAdmin);
      if (!isAdmin) {
        throw new BadRequestException("Vous ne pouvez pas corriger votre propre travail.");
      }
    }

    // Récupérer les données du nœud pour obtenir minimumScore et xp
    const nodeData = await this.graphService.getNodeById(correction.projectId);
    const minimumScore = nodeData?.minimumScore ?? 80; // Fallback à 80 si non défini
    const xpReward = nodeData?.xp ?? 1000; // Fallback à 1000 si non défini
    
    console.log(`Node data: minScore=${minimumScore}, xpReward=${xpReward}`);

    correction.correctorId = corrector.id;
    correction.finalMark = mark;
    correction.comments = comments || '';
    
    // Logique de validation: utilise le minimumScore configuré sur le nœud
    const isSuccess = mark >= minimumScore;
    correction.status = isSuccess ? CorrectionStatus.VALIDATED : CorrectionStatus.FAILED;
    
    console.log(`Validation result: success=${isSuccess}, newStatus=${correction.status}`);

    const savedCorrection = await this.correctionsRepository.save(correction);

    // Award evaluation point to corrector
    try {
      await this.usersService.updateEvaluationPoints(corrector.id, 1);
    } catch (e) {
      console.error(`Failed to award evaluation point to corrector ${corrector.id}`, e);
    }

    // IMPACT SUR LE GRAPHE NEO4J
    if (isSuccess) {
      console.log(`Correction validated! Awarding ${xpReward} XP to ${correction.studentId} for ${correction.projectId}`);
      try {
          // Utilise l'XP configuré sur le nœud
          await this.graphService.validateSkill(correction.studentId, correction.projectId, xpReward);
          console.log('validateSkill executed successfully');

          // Points de Coalition (Bonus)
          if (correction.student && correction.student.coalition) {
             // Points = XP / 10
             await this.coalitionsService.addPoints(correction.student.coalition, Math.floor(xpReward / 10));
             console.log('Coalition points added');
          }
      } catch (err) {
          console.error('Error during graph/coalition update:', err);
          // On ne throw pas ici pour ne pas annuler la sauvegarde de la correction, 
          // mais c'est critique.
      }
    }

    return savedCorrection;
  }

  async findAllHistory() {
    return this.correctionsRepository.find({
      relations: ['student', 'corrector'],
      order: { createdAt: 'DESC' },
      take: 100 // Limite aux 100 dernières pour le prototype
    });
  }

  async getRecentActivity() {
    const results = await this.correctionsRepository.find({
      where: { status: CorrectionStatus.VALIDATED },
      relations: ['student'],
      order: { updatedAt: 'DESC' },
      take: 10
    });

    const enrichedResults: any[] = [];
    for (const activity of results) {
        const node = await this.graphService.getNodeById(activity.projectId);
        enrichedResults.push({
            id: activity.id,
            projectId: activity.projectId,
            projectLabel: this.getReadableProjectLabel(node, activity.projectId),
            finalMark: activity.finalMark,
            student: activity.student ? {
                id: activity.student.id,
                firstName: activity.student.firstName,
                lastName: activity.student.lastName,
                avatarUrl: activity.student.avatarUrl,
                coalition: activity.student.coalition
            } : null,
            createdAt: activity.createdAt?.toISOString?.() || activity.createdAt,
            updatedAt: activity.updatedAt?.toISOString?.() || activity.updatedAt
        });
    }

    return enrichedResults;
  }

  /**
   * Retourne un label lisible pour un projet
   * Priorité: label > name > title > id formaté
   */
  private getReadableProjectLabel(node: any, projectId: string): string {
    if (!node) return 'Projet supprimé';

    // Utiliser le label s'il existe et est différent de l'ID technique
    if (node.label && !this.looksLikeTechnicalId(node.label)) {
      return node.label;
    }

    // Fallback sur d'autres champs
    if (node.name && !this.looksLikeTechnicalId(node.name)) {
      return node.name;
    }

    if (node.title && !this.looksLikeTechnicalId(node.title)) {
      return node.title;
    }

    // Dernier recours: formatter l'ID pour le rendre lisible
    return this.formatTechnicalIdToLabel(projectId);
  }

  /**
   * Vérifie si une string ressemble à un ID technique (contient un suffixe aléatoire)
   */
  private looksLikeTechnicalId(value: string): boolean {
    if (!value) return true;
    // Patterns typiques d'IDs techniques: _suffixe ou -suffixe avec caractères aléatoires
    return /[_-][a-z0-9]{6,}$/i.test(value);
  }

  /**
   * Convertit un ID technique en label lisible
   * Ex: "_schema_ligaments_et_m_nisques_mksgd0ys" -> "Schéma ligaments et ménisques"
   */
  private formatTechnicalIdToLabel(technicalId: string): string {
    // Supprimer le préfixe _ et le suffixe aléatoire
    let label = technicalId
      .replace(/^_/, '')                    // Supprimer _ au début
      .replace(/[_-][a-z0-9]{6,}$/i, '')    // Supprimer le suffixe aléatoire
      .replace(/_/g, ' ')                   // Remplacer _ par espace
      .replace(/-/g, ' ')                   // Remplacer - par espace
      .trim();

    // Capitaliser la première lettre
    if (label.length > 0) {
      label = label.charAt(0).toUpperCase() + label.slice(1);
    }

    return label || technicalId;
  }
}