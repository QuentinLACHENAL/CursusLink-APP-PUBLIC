import { IsString, IsObject, IsNotEmpty } from 'class-validator';

export class SubmitExerciseDto {
  @IsString()
  @IsNotEmpty()
  nodeId: string;

  @IsObject()
  @IsNotEmpty()
  answers: Record<string, any>; // { "0": 1, "1": [0, 2] }
}
