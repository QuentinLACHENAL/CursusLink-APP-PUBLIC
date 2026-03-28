import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { GraphCrudService } from '../graph/services/graph-crud.service';
import { SubmitExerciseDto } from './dto/submit-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly graphCrudService: GraphCrudService,
  ) {}

  async submitQCM(userId: string, dto: SubmitExerciseDto) {
    return this.verifyExercise(userId, dto);
  }

  async verifyExercise(userId: string, dto: SubmitExerciseDto) {
    // 1. Récupérer la config de l'exercice depuis la DB
    const query = `
        MATCH (n {id: $nodeId}) 
        OPTIONAL MATCH (n)-[:HAS_EXERCISE]->(e:Exercise)
        RETURN coalesce(e.data, n.exerciseData) as data, 
               coalesce(e.type, n.exerciseType) as type,
               n.xp as xp, 
               n.minimumScore as minScore
    `;
    const session = this.neo4jService.getReadSession();
    
    let exerciseDataStr: string;
    let exerciseType: string = 'qcm';
    let xpReward: number = 0;
    let minimumScore: number = 80;

    try {
      const result = await session.run(query, { nodeId: dto.nodeId });
      if (result.records.length === 0) {
        throw new NotFoundException('Exercice introuvable');
      }
      exerciseDataStr = result.records[0].get('data');
      exerciseType = result.records[0].get('type') || 'qcm';
      const xpVal = result.records[0].get('xp');
      const minScoreVal = result.records[0].get('minScore');
      
      xpReward = xpVal?.low !== undefined ? xpVal.low : (xpVal || 0);
      minimumScore = minScoreVal?.low !== undefined ? minScoreVal.low : (minScoreVal || 80);
    } finally {
      await session.close();
    }

    if (!exerciseDataStr) {
      throw new BadRequestException('Ce nœud ne contient pas de données d\'exercice');
    }

    // 2. Parser et Vérifier selon le type
    let config: any;
    try {
      config = JSON.parse(exerciseDataStr);
    } catch (e) {
      throw new BadRequestException('Données d\'exercice corrompues en base');
    }

    let score = 0;
    let details: any[] = [];

    // --- LOGIQUE SCHÉMA ---
    if (exerciseType === 'schema') {
        const blocks = config.blocks || [];
        const userAnswers = dto.answers || {};
        
        let correctCount = 0;
        
        blocks.forEach((block: any) => {
            const userAnswer = userAnswers[block.id];
            // Case-insensitive comparison, trim whitespace
            const isCorrect = userAnswer?.toString().trim().toLowerCase() === block.answer?.toString().trim().toLowerCase();
            
            if (isCorrect) correctCount++;
            
            details.push({
                blockId: block.id,
                expected: block.answer,
                received: userAnswer,
                isCorrect
            });
        });
        
        score = blocks.length > 0 ? Math.round((correctCount / blocks.length) * 100) : 0;
    }
    // --- LOGIQUE MATCHING (Associations) ---
    else if (exerciseType === 'matching') {
        const pairs = config.pairs || [];
        const userAnswers = dto.answers || {};
        let correctCount = 0;
        
        pairs.forEach((pair: any) => {
            // User submits {leftId: rightId} or {pairId: matchedRightValue}
            const userMatch = userAnswers[pair.id];
            const isCorrect = userMatch === pair.right || userMatch === pair.id;
            
            if (isCorrect) correctCount++;
            
            details.push({
                pairId: pair.id,
                expected: pair.right,
                received: userMatch,
                isCorrect
            });
        });
        
        score = pairs.length > 0 ? Math.round((correctCount / pairs.length) * 100) : 0;
    }
    // --- LOGIQUE ORDER (Classement) ---
    else if (exerciseType === 'order') {
        const items = config.items || [];
        const userOrder = dto.answers || {}; // {itemId: userPosition} or {position: itemId}
        let correctCount = 0;
        
        items.forEach((item: any) => {
            const userPosition = userOrder[item.id];
            const isCorrect = Number(userPosition) === Number(item.correctPosition);
            
            if (isCorrect) correctCount++;
            
            details.push({
                itemId: item.id,
                content: item.content,
                expected: item.correctPosition,
                received: userPosition,
                isCorrect
            });
        });
        
        score = items.length > 0 ? Math.round((correctCount / items.length) * 100) : 0;
    }
    // --- LOGIQUE TEXT-FILL (Texte à trous) ---
    else if (exerciseType === 'text-fill') {
        const gaps = config.gaps || [];
        const userAnswers = dto.answers || {};
        const caseSensitive = config.caseSensitive ?? false;
        let correctCount = 0;
        
        gaps.forEach((gap: any) => {
            const userAnswer = userAnswers[gap.id]?.toString() || '';
            const correctAnswer = gap.word?.toString() || '';
            
            const isCorrect = caseSensitive 
                ? userAnswer.trim() === correctAnswer.trim()
                : userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
            
            if (isCorrect) correctCount++;
            
            details.push({
                gapId: gap.id,
                expected: gap.word,
                received: userAnswer,
                isCorrect
            });
        });
        
        score = gaps.length > 0 ? Math.round((correctCount / gaps.length) * 100) : 0;
    }
    // --- LOGIQUE ESTIMATION ---
    else if (exerciseType === 'estimation') {
        const questions = config.questions || [];
        const userAnswers = dto.answers || {};
        let correctCount = 0;
        let totalWeight = 0;
        let weightedScore = 0;
        
        questions.forEach((q: any) => {
            const userValue = Number(userAnswers[q.id]);
            const correctValue = Number(q.correctValue);
            const tolerance = Number(q.tolerance) / 100; // Convert % to decimal
            
            const minAccepted = correctValue * (1 - tolerance);
            const maxAccepted = correctValue * (1 + tolerance);
            const isCorrect = userValue >= minAccepted && userValue <= maxAccepted;
            
            if (isCorrect) correctCount++;
            
            // Calculate partial credit based on distance
            const distance = Math.abs(userValue - correctValue) / correctValue;
            const partialScore = config.partialCredit 
                ? Math.max(0, 1 - distance) * 100 
                : (isCorrect ? 100 : 0);
            
            totalWeight += q.points || 1;
            weightedScore += (partialScore / 100) * (q.points || 1);
            
            details.push({
                questionId: q.id,
                expected: correctValue,
                tolerance: q.tolerance,
                received: userValue,
                isCorrect,
                partialScore: Math.round(partialScore)
            });
        });
        
        score = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
    }
    // --- LOGIQUE AXIS (Placement sur axe) ---
    else if (exerciseType === 'axis') {
        const items = config.items || [];
        const tolerance = Number(config.tolerance) || 0;
        const userAnswers = dto.answers || {};
        let correctCount = 0;
        
        items.forEach((item: any) => {
            const userValue = Number(userAnswers[item.id]);
            const correctValue = Number(item.correctValue);
            
            const isCorrect = Math.abs(userValue - correctValue) <= tolerance;
            
            if (isCorrect) correctCount++;
            
            details.push({
                itemId: item.id,
                content: item.content,
                expected: correctValue,
                tolerance,
                received: userValue,
                isCorrect
            });
        });
        
        score = items.length > 0 ? Math.round((correctCount / items.length) * 100) : 0;
    }
    // --- LOGIQUE QCM (Défaut) ---
    else {
        // Support both formats:
        // - Old format: array of questions [{question, options, correct, multipleAnswers}]
        // - New QCMExerciseConfig format: {type: 'qcm', questions: [{question, options, correctAnswers, multipleCorrect}]}
        let questions: any[];
        
        if (Array.isArray(config)) {
          // Old format - direct array
          questions = config;
        } else if (config.questions && Array.isArray(config.questions)) {
          // New format - map to expected structure
          questions = config.questions.map((q: any) => ({
            question: q.question,
            options: q.options,
            correct: q.multipleCorrect ? q.correctAnswers : (q.correctAnswers?.[0] ?? 0),
            multipleAnswers: q.multipleCorrect
          }));
        } else {
          questions = [];
        }
        
        let correctCount = 0;
        
        questions.forEach((q: any, index: number) => {
          const userAnswer = dto.answers[index.toString()]; 
          const correctAnswer = q.correct;
          let isCorrect = false;

          if (q.multipleAnswers) {
            const userArr = Array.isArray(userAnswer) ? userAnswer.sort() : [];
            const correctArr = Array.isArray(correctAnswer) ? correctAnswer.sort() : [];
            isCorrect = JSON.stringify(userArr) === JSON.stringify(correctArr);
          } else {
            isCorrect = Number(userAnswer) === Number(correctAnswer);
          }

          if (isCorrect) correctCount++;
          
          details.push({
            questionIndex: index,
            isCorrect
          });
        });
        
        score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    }

    const passed = score >= minimumScore;

    // 3. Si réussi, valider le skill
    let validationResult: { message: string; newXp: any } | null = null;
    if (passed) {
      validationResult = await this.graphCrudService.validateSkill(userId, dto.nodeId, xpReward);
    }

    return {
      success: true,
      score,
      passed,
      validation: validationResult,
      details 
    };
  }
}
