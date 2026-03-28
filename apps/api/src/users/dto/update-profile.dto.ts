import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  // Pas de MaxLength car les images base64 sont très longues
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  title?: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-F]{6}$/i, { message: 'Invalid color hex code' })
  nameColor?: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-F]{6}$/i, { message: 'Invalid color hex code' })
  avatarBorder?: string;
}
