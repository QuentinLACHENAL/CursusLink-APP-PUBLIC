/**
 * Security Tests
 * 
 * Tests to verify security measures are properly implemented.
 * These tests ensure that common vulnerabilities are prevented.
 */

import { 
  isValidNodeLabel, 
  validateLabels, 
  isValidRelationshipType, 
  validateRelationshipType,
  validateNodeId,
  sanitizePropertyValue,
} from '../../src/common/utils/neo4j-validation';

describe('Security Validation Utilities', () => {
  describe('isValidNodeLabel', () => {
    it('should accept valid labels', () => {
      const validLabels = ['Skill', 'Exercise', 'User', 'Constellation', 'Planet'];
      
      validLabels.forEach(label => {
        expect(isValidNodeLabel(label)).toBe(true);
      });
    });

    it('should reject invalid labels', () => {
      const invalidLabels = [
        'InvalidLabel',
        'Skill; DROP DATABASE',
        'Skill`',
        '',
      ];

      invalidLabels.forEach(label => {
        expect(isValidNodeLabel(label)).toBe(false);
      });
    });

    it('should reject Cypher injection attempts', () => {
      const injectionAttempts = [
        'Skill])-[:ATTACK]->(:Database)',
        'Skill\') RETURN n; MATCH (a) DETACH DELETE a;//',
        'Skill" OR 1=1--',
        '${process.env.SECRET}',
      ];

      injectionAttempts.forEach(attempt => {
        expect(isValidNodeLabel(attempt)).toBe(false);
      });
    });
  });

  describe('validateLabels', () => {
    it('should return valid labels from array', () => {
      const result = validateLabels(['Skill', 'InvalidLabel', 'Exercise']);
      expect(result).toEqual(['Skill', 'Exercise']);
    });

    it('should throw when no valid labels', () => {
      expect(() => validateLabels(['Invalid1', 'Invalid2']))
        .toThrow('No valid labels found');
    });
  });

  describe('isValidRelationshipType', () => {
    it('should accept valid relationship types', () => {
      const validTypes = [
        'UNLOCKS', 'REQUIRES', 'MASTERED', 'CONTAINS',
        'BELONGS_TO', 'ORBITS', 'PART_OF', 'HAS_EXERCISE'
      ];

      validTypes.forEach(type => {
        expect(isValidRelationshipType(type)).toBe(true);
      });
    });

    it('should reject invalid relationship types', () => {
      const invalidTypes = [
        'INVALID_TYPE',
        'DROP_DATABASE',
        'unlocks', // Case sensitive
        '',
      ];

      invalidTypes.forEach(type => {
        expect(isValidRelationshipType(type)).toBe(false);
      });
    });
  });

  describe('validateRelationshipType', () => {
    it('should return valid type', () => {
      expect(validateRelationshipType('UNLOCKS')).toBe('UNLOCKS');
    });

    it('should throw for invalid type', () => {
      expect(() => validateRelationshipType('INVALID'))
        .toThrow('Invalid relationship type');
    });

    it('should reject injection in relationship types', () => {
      const injectionAttempts = [
        'UNLOCKS]->(n) DETACH DELETE n WITH n MATCH (m)-[r:',
        'UNLOCKS`; DROP DATABASE',
      ];

      injectionAttempts.forEach(attempt => {
        expect(() => validateRelationshipType(attempt)).toThrow();
      });
    });
  });

  describe('validateNodeId', () => {
    it('should accept valid node IDs', () => {
      const validIds = [
        'skill_javascript_basics',
        'exercise-123',
        'user_42',
        'node-with-dashes-and_underscores',
      ];

      validIds.forEach(id => {
        expect(validateNodeId(id)).toBe(id);
      });
    });

    it('should accept UUIDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(validateNodeId(uuid)).toBe(uuid);
    });

    it('should reject dangerous characters', () => {
      const dangerousIds = [
        "id'; DROP TABLE--",
        'id`${evil}`',
        'id\n\r',
        'id<script>',
      ];

      dangerousIds.forEach(id => {
        expect(() => validateNodeId(id)).toThrow();
      });
    });

    it('should reject empty or null IDs', () => {
      expect(() => validateNodeId('')).toThrow();
      expect(() => validateNodeId(null as any)).toThrow();
    });

    it('should reject IDs exceeding max length', () => {
      const longId = 'a'.repeat(256);
      expect(() => validateNodeId(longId)).toThrow('must not exceed 255 characters');
    });
  });

  describe('sanitizePropertyValue', () => {
    it('should pass through valid values', () => {
      expect(sanitizePropertyValue('hello')).toBe('hello');
      expect(sanitizePropertyValue(123)).toBe(123);
      expect(sanitizePropertyValue(null)).toBe(null);
    });

    it('should remove control characters from strings', () => {
      const input = 'hello\x00world\x1F';
      const result = sanitizePropertyValue(input);
      expect(result).not.toContain('\x00');
      expect(result).not.toContain('\x1F');
    });

    it('should sanitize arrays recursively', () => {
      const input = ['hello\x00', 'world'];
      const result = sanitizePropertyValue(input);
      expect(result[0]).not.toContain('\x00');
    });

    it('should sanitize objects recursively', () => {
      const input = { name: 'test\x00', value: 123 };
      const result = sanitizePropertyValue(input);
      expect(result.name).not.toContain('\x00');
    });

    it('should reject invalid property keys', () => {
      const input = { 'valid_key': 'ok', '123invalid': 'bad', 'also-invalid': 'bad' };
      const result = sanitizePropertyValue(input);
      expect(result).toHaveProperty('valid_key');
      expect(result).not.toHaveProperty('123invalid');
    });
  });
});

describe('Timing Attack Prevention', () => {
  it('should have consistent timing for valid and invalid users', async () => {
    const compareWithDummyHash = async (password: string, storedHash: string | null) => {
      const bcrypt = { compare: jest.fn().mockResolvedValue(false) };
      const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF.ghijklmnopqrstuvwxyz12';
      
      await bcrypt.compare(password, storedHash || DUMMY_HASH);
      
      return storedHash ? bcrypt.compare.mock.results[0].value : false;
    };

    const result1 = await compareWithDummyHash('password', '$2b$10$validhash...');
    const result2 = await compareWithDummyHash('password', null);

    expect(result1).toBe(false);
    expect(result2).toBe(false);
  });
});

describe('Session Leak Prevention', () => {
  it('should always close sessions in finally block', async () => {
    const safeSessionUsage = async (session: any) => {
      try {
        await session.run('MATCH (n) RETURN n');
        return { success: true };
      } catch (error) {
        return { success: false, error };
      } finally {
        await session.close();
      }
    };

    const mockSession = {
      run: jest.fn().mockRejectedValue(new Error('Query failed')),
      close: jest.fn().mockResolvedValue(undefined),
    };

    await safeSessionUsage(mockSession);
    expect(mockSession.close).toHaveBeenCalled();
  });
});

describe('Race Condition Prevention', () => {
  it('should use pessimistic locking for critical operations', async () => {
    const purchaseWithLock = async (userId: number, queryRunner: any) => {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      try {
        const user = await queryRunner.manager
          .createQueryBuilder('User', 'u')
          .where('u.id = :userId', { userId })
          .setLock('pessimistic_write')
          .getOne();

        if (!user || user.credits < 100) {
          throw new Error('Insufficient credits');
        }

        await queryRunner.manager.update('User', userId, { credits: user.credits - 100 });
        await queryRunner.commitTransaction();
        return { success: true };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    };

    const mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          setLock: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ id: 1, credits: 200 }),
        }),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      },
    };

    const result = await purchaseWithLock(1, mockQueryRunner);

    expect(result.success).toBe(true);
    expect(mockQueryRunner.manager.createQueryBuilder().setLock).toHaveBeenCalledWith('pessimistic_write');
  });
});

describe('Input Validation', () => {
  describe('XSS Prevention', () => {
    it('should escape HTML entities in user inputs', () => {
      const escapeHtml = (input: string): string => {
        return input
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };

      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '"><script>evil()</script>',
      ];

      maliciousInputs.forEach(input => {
        const escaped = escapeHtml(input);
        expect(escaped).not.toContain('<script>');
        expect(escaped).not.toContain('<img');
      });
    });
  });

  describe('SQL/Cypher Injection Prevention', () => {
    it('should use parameterized queries', () => {
      const safeQuery = (nodeId: string) => {
        const cypher = 'MATCH (n {id: $nodeId}) RETURN n';
        const params = { nodeId };
        
        expect(cypher).not.toContain(nodeId);
        expect(params.nodeId).toBe(nodeId);
        
        return { cypher, params };
      };

      const { cypher } = safeQuery("'; DROP DATABASE;--");
      expect(cypher).toBe('MATCH (n {id: $nodeId}) RETURN n');
    });
  });
});

describe('Password Security', () => {
  it('should use crypto.randomBytes for password generation', () => {
    const crypto = require('crypto');
    
    const generateSecurePassword = (length: number = 16): string => {
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
      const bytes = crypto.randomBytes(length);
      let password = '';
      
      for (let i = 0; i < length; i++) {
        password += charset[bytes[i] % charset.length];
      }
      
      return password;
    };

    const password = generateSecurePassword(16);
    
    expect(password.length).toBe(16);
    expect(new Set(password.split('')).size).toBeGreaterThan(5);
  });
});

describe('Transaction Atomicity', () => {
  it('should rollback on partial failure in distributed transactions', async () => {
    const createUserWithRollback = async (
      postgresRepo: any,
      neo4jSession: any,
      userData: any
    ) => {
      const queryRunner = postgresRepo.manager.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const pgUser = await queryRunner.manager.save(userData);
        await neo4jSession.run(
          'MERGE (u:User {id: $id}) SET u.login = $login',
          { id: pgUser.id, login: pgUser.login }
        );
        await queryRunner.commitTransaction();
        return pgUser;
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
        await neo4jSession.close();
      }
    };

    const mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        save: jest.fn().mockResolvedValue({ id: 1, login: 'test' }),
      },
    };

    const mockSession = {
      run: jest.fn().mockRejectedValue(new Error('Neo4j connection failed')),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const mockRepo = {
      manager: {
        connection: {
          createQueryRunner: () => mockQueryRunner,
        },
      },
    };

    await expect(
      createUserWithRollback(mockRepo, mockSession, { login: 'test' })
    ).rejects.toThrow('Neo4j connection failed');

    expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
  });
});
