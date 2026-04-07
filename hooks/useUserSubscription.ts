import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "./useCurrentUser";
import { useIsSwitchingUsers } from "./useIsSwitchingUsers";
import { useMemo } from "react";

/**
 * Hook to manage user subscription, points balance, and tier status.
 * Centralizes the logic for "Premium" checks and loyalty tiers.
 */
export function useUserSubscription() {
  const { user: convexUser, firstName } = useCurrentUser();
  const isSwitchingUsers = useIsSwitchingUsers();

  const pointsBalance = useQuery(
    api.points.getPointsBalance,
    !isSwitchingUsers ? {} : "skip"
  );
  
  const subscription = useQuery(
    api.subscriptions.getCurrentSubscription,
    !isSwitchingUsers ? {} : "skip"
  );

  const isPremium = useMemo(() => {
    if (!subscription) return false;
    return ("isActive" in subscription && subscription.isActive) || subscription.status === "trial";
  }, [subscription]);

  const tier = useMemo(() => {
    return pointsBalance?.tier || "bronze";
  }, [pointsBalance]);

  // L5 fix: Removed redundant useMemo - string capitalization is trivial
  const formattedTier = tier.charAt(0).toUpperCase() + tier.slice(1);

  const pointsToNextTier = useMemo(() => {
    return pointsBalance?.nextTierInfo?.scansToNextTier ?? 0;
  }, [pointsBalance]);

  const isLoading = pointsBalance === undefined || subscription === undefined;

  return {
    // Basic Info
    firstName,
    user: convexUser,
    
    // Subscription
    subscription,
    isPremium,
    planName: subscription?.status === "trial" ? "Premium Trial" : isPremium ? "Premium" : "Free Plan",
    
    // Points & Tiers
    pointsBalance,
    availablePoints: pointsBalance?.availablePoints ?? 0,
    totalPoints: pointsBalance?.totalPoints ?? 0,
    tier,
    formattedTier,
    pointsToNextTier,
    tierProgress: pointsBalance?.tierProgress ?? 0,
    
    // Status
    isLoading,
  };
}
