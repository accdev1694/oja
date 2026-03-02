// Receipt validation for fraud prevention
import { getTierFromScans, checkFeatureAccess, getMaxEarningScans } from "./featureGating";

// Generate SHA-256 hash from ArrayBuffer
export async function generateImageHash(arrayBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function isValidUKStore(storeName: string): boolean {
  if (!storeName || storeName === "Unknown Store") return false;
  
  const whitelist = [
    "tesco", "sainsbury", "asda", "morrisons", "aldi", "lidl", 
    "waitrose", "co-op", "iceland", "m&s", "ocado", "budgens", 
    "nisa", "spar", "primark"
  ];
  
  const normalized = storeName.toLowerCase().replace(/[^a-z]/g, '');
  
  for (const store of whitelist) {
    if (normalized.includes(store.replace(/[^a-z]/g, ''))) {
      return true;
    }
  }
  return false;
}

export function detectAnomalousPattern(recentScans: any[], newScan: any): boolean {
  if (recentScans.length === 0) return false;
  
  let sameTotalCount = 0;
  let sameItemCount = 0;

  for (const scan of recentScans) {
    if (scan.total > 0 && Math.abs(scan.total - newScan.total) < 0.01) {
      sameTotalCount++;
    }
    if (scan.items?.length === newScan.items?.length) {
      sameItemCount++;
    }
  }

  // If 3 or more recent scans have the exact same total, flag it
  if (sameTotalCount >= 3) return true;
  
  // If 5 or more recent scans have the exact same item count, flag it
  if (sameItemCount >= 5) return true;

  return false;
}

export interface ValidationResult {
  isValid: boolean;
  flags: string[];
  reason?: string;
}

export async function validateReceiptData(
  ctx: any, 
  userId: any, 
  imageHash: string, 
  ocrData: any
): Promise<ValidationResult> {
  const flags: string[] = [];
  let isValid = true;
  let reason: string | undefined;

  // 1. Duplicate detection
  const duplicates = await ctx.db
    .query("receiptHashes")
    .withIndex("by_hash", (q: any) => q.eq("imageHash", imageHash))
    .collect();
    
  if (duplicates.length > 0) {
    flags.push("duplicate_hash");
    isValid = false;
    reason = "This exact receipt image has already been submitted.";
    return { isValid, flags, reason };
  }

  // 2. OCR Confidence
  if (ocrData.imageQuality != null && ocrData.imageQuality < 70) {
    flags.push("low_confidence");
  }

  // 3. Date validation
  if (ocrData.purchaseDate) {
    const purchaseTime = new Date(ocrData.purchaseDate).getTime();
    const now = Date.now();
    const daysOld = (now - purchaseTime) / (1000 * 60 * 60 * 24);
    
    if (daysOld > 30) {
      isValid = false;
      reason = "Receipts must be less than 30 days old.";
      flags.push("too_old");
      return { isValid, flags, reason };
    }
    if (daysOld < 0) {
      flags.push("future_date");
    }
  }

  // 4. Store validation
  if (!isValidUKStore(ocrData.storeName)) {
    flags.push("unknown_store");
  }

  // 5. Price validation
  if (ocrData.items) {
    let suspiciousPrices = 0;
    for (const item of ocrData.items) {
      if (item.unitPrice < 0.10 || item.unitPrice > 100) {
        suspiciousPrices++;
      }
    }
    if (suspiciousPrices > 0) {
      flags.push("suspicious_prices");
    }
  }

  // 6. Rate limiting (Daily)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  
  const todayScans = await ctx.db
    .query("receipts")
    .withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("purchaseDate", todayStart.getTime()))
    .collect();
    
  if (todayScans.length >= 2) { // Max 2 per day to prevent spam
    isValid = false;
    reason = "Daily receipt scanning limit reached (max 2 per day).";
    flags.push("rate_limited");
    return { isValid, flags, reason };
  }

  // 7. Pattern Detection
  const recentScans = await ctx.db
    .query("receipts")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .order("desc")
    .take(10);
    
  if (detectAnomalousPattern(recentScans, ocrData)) {
    flags.push("anomalous_pattern");
  }

  return { isValid, flags, reason };
}
