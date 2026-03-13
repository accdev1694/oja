/**
 * Gamification (Re-export Barrel)
 *
 * All functions have been modularized into:
 *   - streaks.ts: updateStreak, getStreaks
 *   - achievements.ts: getAchievements, unlockAchievement, checkPointsAchievements, checkPantryAchievements
 *   - savingsJar.ts: getSavingsJar
 *   - storeAchievements.ts: checkStoreAchievements, checkDealAchievements, getStoreAchievementProgress
 *
 * This barrel preserves backward compatibility for api["insights/gamification"].* references.
 */

export {
  updateStreak,
  getStreaks,
} from "./streaks";

export {
  getAchievements,
  unlockAchievement,
  checkPointsAchievements,
  checkPantryAchievements,
} from "./achievements";

export { getSavingsJar } from "./savingsJar";

export {
  checkStoreAchievements,
  checkDealAchievements,
  getStoreAchievementProgress,
} from "./storeAchievements";
