import { IsEmail, IsNotEmpty, MinLength, IsString, IsOptional, Matches } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Format d\'email invalide' })
  @IsNotEmpty({ message: 'L\'email est requis' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    { message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre' }
  )
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  lastName: string;

  @IsString()
  @IsOptional()
  school?: string;
}
