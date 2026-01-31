/**
 * Partner Mode - Comments Tests
 * Tests comment creation, retrieval, and validation
 */

describe("Partner Comments", () => {
  interface Comment {
    id: string;
    itemId: string;
    userId: string;
    userName: string;
    text: string;
    createdAt: number;
  }

  let commentIdCounter = 0;

  function createComment(
    itemId: string,
    userId: string,
    userName: string,
    text: string
  ): Comment {
    if (!text || text.trim().length === 0) {
      throw new Error("Comment text cannot be empty");
    }
    if (text.length > 500) {
      throw new Error("Comment too long (max 500 characters)");
    }
    return {
      id: `comment_${++commentIdCounter}`,
      itemId,
      userId,
      userName,
      text: text.trim(),
      createdAt: Date.now(),
    };
  }

  function getCommentsForItem(
    comments: Comment[],
    itemId: string
  ): Comment[] {
    return comments
      .filter((c) => c.itemId === itemId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function getCommentCounts(
    comments: Comment[],
    itemIds: string[]
  ): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const id of itemIds) {
      counts[id] = comments.filter((c) => c.itemId === id).length;
    }
    return counts;
  }

  function getNotificationRecipients(
    ownerId: string,
    partnerIds: string[],
    commentAuthorId: string
  ): string[] {
    const all = [ownerId, ...partnerIds];
    return all.filter((id) => id !== commentAuthorId);
  }

  beforeEach(() => {
    commentIdCounter = 0;
  });

  describe("createComment", () => {
    it("should create a comment with trimmed text", () => {
      const comment = createComment("item_1", "user_1", "Alice", "  Great find!  ");
      expect(comment.text).toBe("Great find!");
      expect(comment.itemId).toBe("item_1");
      expect(comment.userId).toBe("user_1");
    });

    it("should reject empty text", () => {
      expect(() => createComment("item_1", "user_1", "Alice", "")).toThrow("cannot be empty");
    });

    it("should reject whitespace-only text", () => {
      expect(() => createComment("item_1", "user_1", "Alice", "   ")).toThrow("cannot be empty");
    });

    it("should reject text over 500 characters", () => {
      const longText = "A".repeat(501);
      expect(() => createComment("item_1", "user_1", "Alice", longText)).toThrow("too long");
    });

    it("should accept exactly 500 characters", () => {
      const text = "A".repeat(500);
      const comment = createComment("item_1", "user_1", "Alice", text);
      expect(comment.text).toHaveLength(500);
    });

    it("should assign unique IDs", () => {
      const c1 = createComment("item_1", "user_1", "Alice", "First");
      const c2 = createComment("item_1", "user_1", "Alice", "Second");
      expect(c1.id).not.toBe(c2.id);
    });
  });

  describe("getCommentsForItem", () => {
    it("should filter comments by item ID", () => {
      const comments = [
        createComment("item_1", "user_1", "Alice", "Comment 1"),
        createComment("item_2", "user_2", "Bob", "Comment 2"),
        createComment("item_1", "user_2", "Bob", "Comment 3"),
      ];

      const result = getCommentsForItem(comments, "item_1");
      expect(result).toHaveLength(2);
      expect(result.every((c) => c.itemId === "item_1")).toBe(true);
    });

    it("should sort newest first", () => {
      const comments = [
        { ...createComment("item_1", "user_1", "Alice", "Old"), createdAt: 1000 },
        { ...createComment("item_1", "user_1", "Alice", "New"), createdAt: 2000 },
      ];

      const result = getCommentsForItem(comments, "item_1");
      expect(result[0].text).toBe("New");
      expect(result[1].text).toBe("Old");
    });

    it("should return empty array for no matches", () => {
      const result = getCommentsForItem([], "item_1");
      expect(result).toEqual([]);
    });
  });

  describe("getCommentCounts", () => {
    it("should return counts for each item", () => {
      const comments = [
        createComment("item_1", "user_1", "Alice", "A"),
        createComment("item_1", "user_2", "Bob", "B"),
        createComment("item_2", "user_1", "Alice", "C"),
      ];

      const counts = getCommentCounts(comments, ["item_1", "item_2", "item_3"]);
      expect(counts).toEqual({ item_1: 2, item_2: 1, item_3: 0 });
    });

    it("should return zero for items with no comments", () => {
      const counts = getCommentCounts([], ["item_1"]);
      expect(counts).toEqual({ item_1: 0 });
    });
  });

  describe("getNotificationRecipients", () => {
    it("should include owner and partners except author", () => {
      const recipients = getNotificationRecipients("owner_1", ["user_2", "user_3"], "user_2");
      expect(recipients).toEqual(["owner_1", "user_3"]);
    });

    it("should exclude owner if they are the author", () => {
      const recipients = getNotificationRecipients("owner_1", ["user_2"], "owner_1");
      expect(recipients).toEqual(["user_2"]);
    });

    it("should return all others when author is not in list", () => {
      const recipients = getNotificationRecipients("owner_1", ["user_2"], "user_99");
      expect(recipients).toEqual(["owner_1", "user_2"]);
    });
  });
});
