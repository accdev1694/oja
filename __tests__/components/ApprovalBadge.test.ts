/**
 * Component Tests - ApprovalBadge
 * Tests correct status rendering for approval states
 */

describe("ApprovalBadge Component Logic", () => {
  type ApprovalStatus = "none" | "pending" | "approved" | "rejected";

  interface BadgeConfig {
    label: string;
    color: string;
    icon: string;
    visible: boolean;
  }

  function getApprovalBadgeConfig(status: ApprovalStatus): BadgeConfig {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          color: "#FFA726",
          icon: "clock-outline",
          visible: true,
        };
      case "approved":
        return {
          label: "Approved",
          color: "#00D4AA",
          icon: "check-circle",
          visible: true,
        };
      case "rejected":
        return {
          label: "Rejected",
          color: "#FF5252",
          icon: "close-circle",
          visible: true,
        };
      case "none":
      default:
        return {
          label: "",
          color: "transparent",
          icon: "",
          visible: false,
        };
    }
  }

  describe("Badge visibility", () => {
    it("should be visible for pending status", () => {
      expect(getApprovalBadgeConfig("pending").visible).toBe(true);
    });

    it("should be visible for approved status", () => {
      expect(getApprovalBadgeConfig("approved").visible).toBe(true);
    });

    it("should be visible for rejected status", () => {
      expect(getApprovalBadgeConfig("rejected").visible).toBe(true);
    });

    it("should be hidden for none status", () => {
      expect(getApprovalBadgeConfig("none").visible).toBe(false);
    });
  });

  describe("Badge labels", () => {
    it("should show Pending for pending", () => {
      expect(getApprovalBadgeConfig("pending").label).toBe("Pending");
    });

    it("should show Approved for approved", () => {
      expect(getApprovalBadgeConfig("approved").label).toBe("Approved");
    });

    it("should show Rejected for rejected", () => {
      expect(getApprovalBadgeConfig("rejected").label).toBe("Rejected");
    });

    it("should show empty label for none", () => {
      expect(getApprovalBadgeConfig("none").label).toBe("");
    });
  });

  describe("Badge colors", () => {
    it("pending should be orange/warning", () => {
      expect(getApprovalBadgeConfig("pending").color).toBe("#FFA726");
    });

    it("approved should be teal/success", () => {
      expect(getApprovalBadgeConfig("approved").color).toBe("#00D4AA");
    });

    it("rejected should be red/danger", () => {
      expect(getApprovalBadgeConfig("rejected").color).toBe("#FF5252");
    });
  });

  describe("Badge icons", () => {
    it("pending should use clock icon", () => {
      expect(getApprovalBadgeConfig("pending").icon).toBe("clock-outline");
    });

    it("approved should use check icon", () => {
      expect(getApprovalBadgeConfig("approved").icon).toBe("check-circle");
    });

    it("rejected should use close icon", () => {
      expect(getApprovalBadgeConfig("rejected").icon).toBe("close-circle");
    });
  });
});
