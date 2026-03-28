import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class RequestCorrectionDto {
  @IsString()
  @IsNotEmpty({ message: 'L\'ID du projet est requis' })
  projectId: string;

  @IsString()
  @IsOptional()
  submissionData?: string;
}

export class SubmitCorrectionDto {
  @IsString()
  @IsNotEmpty({ message: 'L\'ID de la correction est requis' })
  correctionId: string;

  @IsNumber()
  @Min(0, { message: 'La note minimum est 0' })
  @Max(100, { message: 'La note maximum est 100' })
  mark: number;

  @IsString()
  @IsOptional()
  comments?: string;
}
