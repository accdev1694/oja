describe("Invite Code Logic", () => {
  function generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  function isValidCode(code: string): boolean {
    return /^[A-Z0-9]{6}$/.test(code);
  }

  function isExpired(expiresAt: number): boolean {
    return expiresAt < Date.now();
  }

  describe("generateInviteCode", () => {
    it("should generate a 6-character code", () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(6);
    });

    it("should generate uppercase codes", () => {
      const code = generateInviteCode();
      expect(code).toBe(code.toUpperCase());
    });

    it("should generate alphanumeric codes", () => {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it("should generate unique codes", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      // With 36^6 = ~2.2 billion possibilities, 100 codes should all be unique
      expect(codes.size).toBe(100);
    });
  });

  describe("isValidCode", () => {
    it("should accept valid 6-char uppercase alphanumeric", () => {
      expect(isValidCode("ABC123")).toBe(true);
    });

    it("should reject lowercase", () => {
      expect(isValidCode("abc123")).toBe(false);
    });

    it("should reject too short", () => {
      expect(isValidCode("ABC")).toBe(false);
    });

    it("should reject too long", () => {
      expect(isValidCode("ABCDEFG")).toBe(false);
    });

    it("should reject special characters", () => {
      expect(isValidCode("ABC-23")).toBe(false);
    });

    it("should accept all-numeric", () => {
      expect(isValidCode("123456")).toBe(true);
    });

    it("should accept all-alpha", () => {
      expect(isValidCode("ABCDEF")).toBe(true);
    });
  });

  describe("isExpired", () => {
    it("should return true for past dates", () => {
      expect(isExpired(Date.now() - 1000)).toBe(true);
    });

    it("should return false for future dates", () => {
      expect(isExpired(Date.now() + 86400000)).toBe(false);
    });

    it("should handle 7-day expiry correctly", () => {
      const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(isExpired(sevenDaysFromNow)).toBe(false);
    });
  });
});
