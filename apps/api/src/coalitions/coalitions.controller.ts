import { Controller, Get, Query } from '@nestjs/common';
import { CoalitionsService } from './coalitions.service';

@Controller('coalitions')
export class CoalitionsController {
  constructor(private readonly coalitionsService: CoalitionsService) {}

  @Get()
  findAll(@Query('school') school?: string) {
    if (school) {
        return this.coalitionsService.findBySchool(school);
    }
    return this.coalitionsService.findAll();
  }
}
