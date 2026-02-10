/**
 * Tests for useNetworkStatus hook logic
 *
 * Tests the status message generation logic that wraps Convex's
 * useConvexConnectionState to provide simplified offline status handling.
 */

describe("NetworkStatus Logic", () => {
  interface ConnectionState {
    isWebSocketConnected: boolean;
    inflightMutations: number;
    hasEverConnected: boolean;
  }

  interface NetworkStatus {
    isConnected: boolean;
    hasPendingMutations: boolean;
    pendingMutationCount: number;
    hasEverConnected: boolean;
    statusMessage: string;
  }

  /**
   * Mirrors the logic in useNetworkStatus hook
   */
  function computeNetworkStatus(connectionState: ConnectionState): NetworkStatus {
    const isConnected = connectionState.isWebSocketConnected;
    const pendingMutationCount = connectionState.inflightMutations ?? 0;
    const hasPendingMutations = pendingMutationCount > 0;
    const hasEverConnected = connectionState.hasEverConnected ?? false;

    let statusMessage: string;
    if (!hasEverConnected) {
      statusMessage = "Connecting...";
    } else if (!isConnected && hasPendingMutations) {
      statusMessage = `Offline - ${pendingMutationCount} ${pendingMutationCount === 1 ? "change" : "changes"} pending`;
    } else if (!isConnected) {
      statusMessage = "Offline - changes will sync when connected";
    } else if (hasPendingMutations) {
      statusMessage = "Syncing...";
    } else {
      statusMessage = "Connected";
    }

    return {
      isConnected,
      hasPendingMutations,
      pendingMutationCount,
      hasEverConnected,
      statusMessage,
    };
  }

  describe("Connected state", () => {
    it("should return Connected when WebSocket is connected with no pending mutations", () => {
      const status = computeNetworkStatus({
        isWebSocketConnected: true,
        inflightMutations: 0,
        hasEverConnected: true,
      });

      expect(status.isConnected).toBe(true);
      expect(status.hasPendingMutations).toBe(false);
      expect(status.pendingMutationCount).toBe(0);
      expect(status.statusMessage).toBe("Connected");
    });

    it("should return Syncing when connected with pending mutations", () => {
      const status = computeNetworkStatus({
        isWebSocketConnected: true,
        inflightMutations: 2,
        hasEverConnected: true,
      });

      expect(status.isConnected).toBe(true);
      expect(status.hasPendingMutations).toBe(true);
      expect(status.statusMessage).toBe("Syncing...");
    });
  });

  describe("Disconnected state", () => {
    it("should return offline status when WebSocket is disconnected", () => {
      const status = computeNetworkStatus({
        isWebSocketConnected: false,
        inflightMutations: 0,
        hasEverConnected: true,
      });

      expect(status.isConnected).toBe(false);
      expect(status.hasPendingMutations).toBe(false);
      expect(status.statusMessage).toBe("Offline - changes will sync when connected");
    });

    it("should show pending mutations count when offline with queued mutations", () => {
      const status = computeNetworkStatus({
        isWebSocketConnected: false,
        inflightMutations: 3,
        hasEverConnected: true,
      });

      expect(status.isConnected).toBe(false);
      expect(status.hasPendingMutations).toBe(true);
      expect(status.pendingMutationCount).toBe(3);
      expect(status.statusMessage).toBe("Offline - 3 changes pending");
    });

    it("should use singular form for 1 pending mutation", () => {
      const status = computeNetworkStatus({
        isWebSocketConnected: false,
        inflightMutations: 1,
        hasEverConnected: true,
      });

      expect(status.statusMessage).toBe("Offline - 1 change pending");
    });
  });

  describe("Initial connection state", () => {
    it("should show Connecting when never connected", () => {
      const status = computeNetworkStatus({
        isWebSocketConnected: false,
        inflightMutations: 0,
        hasEverConnected: false,
      });

      expect(status.hasEverConnected).toBe(false);
      expect(status.statusMessage).toBe("Connecting...");
    });
  });

  describe("Edge cases", () => {
    it("should handle large mutation counts", () => {
      const status = computeNetworkStatus({
        isWebSocketConnected: false,
        inflightMutations: 50,
        hasEverConnected: true,
      });

      expect(status.pendingMutationCount).toBe(50);
      expect(status.statusMessage).toBe("Offline - 50 changes pending");
    });

    it("should handle zero as falsy value correctly", () => {
      const status = computeNetworkStatus({
        isWebSocketConnected: true,
        inflightMutations: 0,
        hasEverConnected: true,
      });

      expect(status.hasPendingMutations).toBe(false);
      expect(status.pendingMutationCount).toBe(0);
    });
  });
});
