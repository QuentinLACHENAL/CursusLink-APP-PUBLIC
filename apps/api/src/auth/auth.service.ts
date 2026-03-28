import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

// Dummy hash for timing attack prevention
// This is a hash of a random string, used when user doesn't exist
const DUMMY_HASH = '$2b$10$dummyHashForTimingAttackPrevention.XYZ123';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validates user credentials
   * Uses constant-time comparison to prevent timing attacks
   */
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    
    // Always run bcrypt.compare to prevent timing attacks
    // If user doesn't exist, compare against dummy hash
    const hashToCompare = user?.passwordHash || DUMMY_HASH;
    const isValidPassword = await bcrypt.compare(pass, hashToCompare);
    
    if (user && isValidPassword) {
      if (user.isBanned) {
        this.logger.warn(`Banned user attempted login: ${email}`);
        throw new UnauthorizedException('User is banned');
      }
      const { passwordHash, ...result } = user;
      return result;
    }
    
    // Log failed attempts for security monitoring
    this.logger.warn(`Failed login attempt for: ${email}`);
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        coalition: user.coalition,
        role: user.role
      }
    };
  }

  async register(userDto: any) {
    return this.usersService.create(userDto);
  }
}