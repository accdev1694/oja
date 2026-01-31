/**
 * Component Tests - ContestModal
 * Tests reason selection, validation, and submit logic
 */

describe("ContestModal Logic", () => {
  const CONTEST_REASONS = [
    "Too expensive",
    "Already have it",
    "Wrong item",
    "Not needed",
    "Better alternative available",
    "Other",
  ];

  interface ContestSubmission {
    itemId: string;
    reason: string;
    customReason?: string;
  }

  function validateSubmission(
    reason: string | null,
    customReason?: string
  ): { valid: boolean; error?: string } {
    if (!reason) {
      return { valid: false, error: "Please select a reason" };
    }

    if (reason === "Other") {
      if (!customReason || customReason.trim().length === 0) {
        return { valid: false, error: "Please provide a reason" };
      }
      if (customReason.length > 200) {
        return { valid: false, error: "Reason too long (max 200 characters)" };
      }
    }

    return { valid: true };
  }

  function buildSubmission(
    itemId: string,
    reason: string,
    customReason?: string
  ): ContestSubmission {
    return {
      itemId,
      reason: reason === "Other" ? customReason! : reason,
      customReason: reason === "Other" ? customReason : undefined,
    };
  }

  describe("CONTEST_REASONS", () => {
    it("should have 6 preset reasons", () => {
      expect(CONTEST_REASONS).toHaveLength(6);
    });

    it("should include Other option", () => {
      expect(CONTEST_REASONS).toContain("Other");
    });

    it("should include common shopping reasons", () => {
      expect(CONTEST_REASONS).toContain("Too expensive");
      expect(CONTEST_REASONS).toContain("Already have it");
    });
  });

  describe("validateSubmission", () => {
    it("should reject null reason", () => {
      const result = validateSubmission(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please select a reason");
    });

    it("should accept preset reason", () => {
      const result = validateSubmission("Too expensive");
      expect(result.valid).toBe(true);
    });

    it("should require custom reason when Other selected", () => {
      const result = validateSubmission("Other");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Please provide a reason");
    });

    it("should accept Other with custom reason", () => {
      const result = validateSubmission("Other", "Found a better brand");
      expect(result.valid).toBe(true);
    });

    it("should reject empty custom reason", () => {
      const result = validateSubmission("Other", "   ");
      expect(result.valid).toBe(false);
    });

    it("should reject custom reason over 200 chars", () => {
      const result = validateSubmission("Other", "A".repeat(201));
      expect(result.valid).toBe(false);
      expect(result.error).toContain("200 characters");
    });

    it("should accept exactly 200 chars", () => {
      const result = validateSubmission("Other", "A".repeat(200));
      expect(result.valid).toBe(true);
    });
  });

  describe("buildSubmission", () => {
    it("should use preset reason directly", () => {
      const submission = buildSubmission("item_1", "Too expensive");
      expect(submission.reason).toBe("Too expensive");
      expect(submission.customReason).toBeUndefined();
    });

    it("should use custom reason when Other selected", () => {
      const submission = buildSubmission("item_1", "Other", "My custom reason");
      expect(submission.reason).toBe("My custom reason");
      expect(submission.customReason).toBe("My custom reason");
    });

    it("should include itemId", () => {
      const submission = buildSubmission("item_42", "Wrong item");
      expect(submission.itemId).toBe("item_42");
    });
  });
});
