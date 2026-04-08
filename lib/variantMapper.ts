import type { VariantOption } from "@/components/items/VariantPicker";

interface RawVariantSize {
  size: string;
  unit?: string;
  unitLabel: string;
  sizeNormalized?: string;
  price: number | null;
  source?: string;
  isUsual?: boolean;
  displayLabel?: string;
  pricePerUnit?: number | null;
  brand?: string;
  productName?: string;
  confidence?: number;
}

const COUNT_SUFFIXES = new Set([
  "eggs", "egg", "pieces", "pcs", "units", "items",
  "rolls", "roll", "sheets", "bags", "bag", "count", "pack", "packs",
]);

export function mapVariantSizes(
  sizes: RawVariantSize[] | undefined
): VariantOption[] {
  if (!sizes) return [];
  return sizes.map((s) => {
    const rawSize = s.sizeNormalized || s.size;
    const trailingUnit = rawSize.match(/[a-z]+$/i)?.[0]?.toLowerCase() || "";
    const normalizedUnit = COUNT_SUFFIXES.has(trailingUnit) ? "pk" : trailingUnit;
    const isBareNumber = /^\d+(?:\.\d+)?$/.test(rawSize);
    const unit =
      (s.unit && !COUNT_SUFFIXES.has(s.unit.toLowerCase()) ? s.unit : "") ||
      normalizedUnit ||
      (isBareNumber ? "pk" : "");
    const numPart = rawSize.match(/^(\d+(?:\.\d+)?)/)?.[1] || rawSize;
    const sizeStr =
      COUNT_SUFFIXES.has(trailingUnit) || isBareNumber
        ? `${numPart}pk`
        : rawSize;
    return {
      variantName: sizeStr,
      size: sizeStr,
      unit,
      price: s.price,
      priceSource: s.source as "personal" | "crowdsourced" | "ai_estimate",
      isUsual: s.isUsual ?? false,
      displayLabel: s.displayLabel,
    };
  });
}
