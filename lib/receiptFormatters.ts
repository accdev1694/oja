import { colors } from "@/components/ui/glass";
import { getStoreInfoSafe } from "@/convex/lib/storeNormalizer";

export function formatReceiptDate(timestamp: number): string {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function getStoreColor(normalizedStoreId: string | undefined): string {
  if (!normalizedStoreId) return colors.text.tertiary;
  return getStoreInfoSafe(normalizedStoreId)?.color ?? colors.text.tertiary;
}
