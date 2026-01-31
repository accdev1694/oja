/**
 * Partner Mode - Contest Flow Tests
 * Tests contest creation, voting, and resolution
 */

describe("Partner Contest Flow", () => {
  type ContestStatus = "open" | "resolved";
  type ContestVote = "keep" | "remove" | "replace";

  interface Contest {
    itemId: string;
    reason: string;
    createdBy: string;
    status: ContestStatus;
    votes: Array<{ userId: string; vote: ContestVote }>;
    resolution?: string;
  }

  function createContest(itemId: string, reason: string, userId: string): Contest {
    if (!reason || reason.trim().length === 0) {
      throw new Error("Reason is required");
    }
    return {
      itemId,
      reason,
      createdBy: userId,
      status: "open",
      votes: [],
    };
  }

  function addVote(contest: Contest, userId: string, vote: ContestVote): Contest {
    if (contest.status !== "open") {
      throw new Error("Cannot vote on resolved contest");
    }
    const existing = contest.votes.find((v) => v.userId === userId);
    if (existing) {
      throw new Error("User has already voted");
    }
    return {
      ...contest,
      votes: [...contest.votes, { userId, vote }],
    };
  }

  function resolveContest(contest: Contest, resolution: string, isOwner: boolean): Contest {
    if (!isOwner) {
      throw new Error("Only list owner can resolve contests");
    }
    if (contest.status === "resolved") {
      throw new Error("Contest already resolved");
    }
    return {
      ...contest,
      status: "resolved",
      resolution,
    };
  }

  function getVoteTally(contest: Contest): Record<ContestVote, number> {
    const tally: Record<ContestVote, number> = { keep: 0, remove: 0, replace: 0 };
    for (const v of contest.votes) {
      tally[v.vote]++;
    }
    return tally;
  }

  describe("createContest", () => {
    it("should create an open contest with reason", () => {
      const contest = createContest("item_1", "Too expensive", "user_1");
      expect(contest.status).toBe("open");
      expect(contest.reason).toBe("Too expensive");
      expect(contest.votes).toHaveLength(0);
    });

    it("should throw if reason is empty", () => {
      expect(() => createContest("item_1", "", "user_1")).toThrow("Reason is required");
    });

    it("should throw if reason is whitespace only", () => {
      expect(() => createContest("item_1", "   ", "user_1")).toThrow("Reason is required");
    });
  });

  describe("addVote", () => {
    it("should add vote to open contest", () => {
      let contest = createContest("item_1", "Price issue", "user_1");
      contest = addVote(contest, "user_2", "keep");
      expect(contest.votes).toHaveLength(1);
      expect(contest.votes[0]).toEqual({ userId: "user_2", vote: "keep" });
    });

    it("should allow multiple users to vote", () => {
      let contest = createContest("item_1", "Price issue", "user_1");
      contest = addVote(contest, "user_2", "keep");
      contest = addVote(contest, "user_3", "remove");
      expect(contest.votes).toHaveLength(2);
    });

    it("should reject duplicate votes", () => {
      let contest = createContest("item_1", "Price issue", "user_1");
      contest = addVote(contest, "user_2", "keep");
      expect(() => addVote(contest, "user_2", "remove")).toThrow("already voted");
    });

    it("should reject votes on resolved contests", () => {
      let contest = createContest("item_1", "Price issue", "user_1");
      contest = resolveContest(contest, "Keeping item", true);
      expect(() => addVote(contest, "user_2", "keep")).toThrow("resolved contest");
    });
  });

  describe("resolveContest", () => {
    it("should resolve as owner", () => {
      let contest = createContest("item_1", "Price issue", "user_1");
      contest = resolveContest(contest, "Keeping the item", true);
      expect(contest.status).toBe("resolved");
      expect(contest.resolution).toBe("Keeping the item");
    });

    it("should reject non-owner resolution", () => {
      const contest = createContest("item_1", "Price issue", "user_1");
      expect(() => resolveContest(contest, "Remove it", false)).toThrow("Only list owner");
    });

    it("should reject double resolution", () => {
      let contest = createContest("item_1", "Price issue", "user_1");
      contest = resolveContest(contest, "Keeping it", true);
      expect(() => resolveContest(contest, "Actually remove", true)).toThrow("already resolved");
    });
  });

  describe("getVoteTally", () => {
    it("should tally all zero for no votes", () => {
      const contest = createContest("item_1", "Test", "user_1");
      expect(getVoteTally(contest)).toEqual({ keep: 0, remove: 0, replace: 0 });
    });

    it("should tally votes correctly", () => {
      let contest = createContest("item_1", "Test", "user_1");
      contest = addVote(contest, "user_2", "keep");
      contest = addVote(contest, "user_3", "keep");
      contest = addVote(contest, "user_4", "remove");
      const tally = getVoteTally(contest);
      expect(tally.keep).toBe(2);
      expect(tally.remove).toBe(1);
      expect(tally.replace).toBe(0);
    });
  });
});
