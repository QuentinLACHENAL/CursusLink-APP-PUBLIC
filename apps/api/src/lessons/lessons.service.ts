import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private lessonsRepository: Repository<Lesson>,
  ) {}

  async findOne(nodeId: string) {
    const lesson = await this.lessonsRepository.findOneBy({ nodeId });
    if (!lesson) {
        // Si pas de leçon, on renvoie une structure vide au lieu d'une 404 pour faciliter l'édition
        return { nodeId, title: '', content: '' };
    }
    return lesson;
  }

  async save(nodeId: string, title: string, content: string) {
    let lesson = await this.lessonsRepository.findOneBy({ nodeId });
    
    if (!lesson) {
      lesson = this.lessonsRepository.create({ nodeId, title, content });
    } else {
      lesson.title = title;
      lesson.content = content;
    }

    return this.lessonsRepository.save(lesson);
  }
}
