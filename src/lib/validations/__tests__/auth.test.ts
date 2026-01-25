import {
  passwordSchema,
  registerSchema,
  loginSchema,
  checkPasswordStrength,
} from '@/lib/validations/auth';

describe('Auth Validation Schemas', () => {
  describe('passwordSchema', () => {
    it('rejects passwords shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Abc123');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Password must be at least 8 characters'
        );
      }
    });

    it('rejects passwords without uppercase letters', () => {
      const result = passwordSchema.safeParse('abcdefgh1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Password must contain at least one uppercase letter'
        );
      }
    });

    it('rejects passwords without lowercase letters', () => {
      const result = passwordSchema.safeParse('ABCDEFGH1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Password must contain at least one lowercase letter'
        );
      }
    });

    it('rejects passwords without numbers', () => {
      const result = passwordSchema.safeParse('Abcdefghi');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Password must contain at least one number'
        );
      }
    });

    it('accepts valid passwords', () => {
      const result = passwordSchema.safeParse('Password1');
      expect(result.success).toBe(true);
    });

    it('accepts complex passwords', () => {
      const result = passwordSchema.safeParse('MySecureP@ssw0rd!');
      expect(result.success).toBe(true);
    });
  });

  describe('registerSchema', () => {
    const validData = {
      email: 'test@example.com',
      password: 'Password1',
      confirmPassword: 'Password1',
    };

    it('accepts valid registration data', () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects empty email', () => {
      const result = registerSchema.safeParse({
        ...validData,
        email: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('rejects invalid email format', () => {
      const result = registerSchema.safeParse({
        ...validData,
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Please enter a valid email address'
        );
      }
    });

    it('rejects mismatched passwords', () => {
      const result = registerSchema.safeParse({
        ...validData,
        confirmPassword: 'DifferentPassword1',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match');
        expect(result.error.issues[0].path).toContain('confirmPassword');
      }
    });

    it('rejects empty confirm password', () => {
      const result = registerSchema.safeParse({
        ...validData,
        confirmPassword: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Please confirm your password'
        );
      }
    });

    it('validates password requirements in registration', () => {
      const result = registerSchema.safeParse({
        ...validData,
        password: 'weak',
        confirmPassword: 'weak',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login data', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'anypassword',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'password',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email is required');
      }
    });

    it('rejects invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    it('does not enforce password complexity for login', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'a',
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('checkPasswordStrength', () => {
  it('returns score 0 for empty password', () => {
    const result = checkPasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.label).toBe('weak');
    expect(result.feedback).toHaveLength(4);
  });

  it('returns score 2 for password with length and numbers only', () => {
    const result = checkPasswordStrength('12345678');
    expect(result.score).toBe(2);
    expect(result.label).toBe('fair');
    expect(result.feedback).toContain('One uppercase letter');
    expect(result.feedback).toContain('One lowercase letter');
  });

  it('returns score 2 (fair) for password with two requirements', () => {
    const result = checkPasswordStrength('abcdefgh');
    expect(result.score).toBe(2);
    expect(result.label).toBe('fair');
    expect(result.feedback).toContain('One uppercase letter');
    expect(result.feedback).toContain('One number');
  });

  it('returns score 3 (good) for password with three requirements', () => {
    const result = checkPasswordStrength('Abcdefgh');
    expect(result.score).toBe(3);
    expect(result.label).toBe('good');
    expect(result.feedback).toContain('One number');
    expect(result.feedback).not.toContain('One uppercase letter');
  });

  it('returns score 4 (strong) for password meeting all requirements', () => {
    const result = checkPasswordStrength('Password1');
    expect(result.score).toBe(4);
    expect(result.label).toBe('strong');
    expect(result.feedback).toHaveLength(0);
  });

  it('handles special characters correctly', () => {
    const result = checkPasswordStrength('P@ssw0rd!');
    expect(result.score).toBe(4);
    expect(result.label).toBe('strong');
  });

  it('correctly identifies missing requirements', () => {
    const result = checkPasswordStrength('abc');
    expect(result.feedback).toContain('At least 8 characters');
    expect(result.feedback).toContain('One uppercase letter');
    expect(result.feedback).toContain('One number');
    expect(result.feedback).not.toContain('One lowercase letter');
  });
});
