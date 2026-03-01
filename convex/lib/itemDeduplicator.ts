import { isDuplicateItemName } from "./fuzzyMatch";

export interface ListItemInput {
  name: string;
  category?: string;
  quantity: number;
  size?: string;
  unit?: string;
  estimatedPrice?: number;
}

export interface DeduplicationResult {
  items: ListItemInput[];
  duplicates: Array<{
    name: string;
    sources: string[];
    keptFrom: string;
    reason: string;
  }>;
}

export function deduplicateItems(
  itemsByList: Map<string, { listName: string; items: ListItemInput[] }>
): DeduplicationResult {
  const allItems: (ListItemInput & { _sourcelist: string })[] = [];
  const itemSources = new Map<string, string[]>(); // item key -> list names

  // Collect all items with source tracking
  for (const [listId, { listName, items }] of itemsByList.entries()) {
    for (const item of items) {
      allItems.push({ ...item, _sourcelist: listName });
      const key = item.name.toLowerCase().trim();
      if (!itemSources.has(key)) {
        itemSources.set(key, []);
      }
      if (!itemSources.get(key)!.includes(listName)) {
        itemSources.get(key)!.push(listName);
      }
    }
  }

  // Use item matcher to find duplicates
  const uniqueItems: ListItemInput[] = [];
  const duplicates: DeduplicationResult["duplicates"] = [];
  const processed = new Set<string>();

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const key = item.name.toLowerCase().trim();

    if (processed.has(key)) continue;

    // Find all items that match this one
    const matches = allItems.filter((other, j) => {
      if (i === j || processed.has(other.name.toLowerCase().trim())) return false;
      return isDuplicateItemName(item.name, other.name);
    });

    if (matches.length === 0) {
      // No duplicates, keep as-is
      const { _sourcelist, ...cleanItem } = item;
      uniqueItems.push(cleanItem);
      processed.add(key);
    } else {
      // Duplicates found - merge intelligently
      const merged = mergeItems([item, ...matches]);
      const { _sourcelist, ...cleanMerged } = merged.item;
      uniqueItems.push(cleanMerged);

      duplicates.push({
        name: merged.item.name,
        sources: itemSources.get(key) || [],
        keptFrom: merged.keptFrom,
        reason: merged.reason,
      });

      // Mark all as processed
      processed.add(key);
      matches.forEach(m => processed.add(m.name.toLowerCase().trim()));
    }
  }

  return {
    items: uniqueItems,
    duplicates,
  };
}

function mergeItems(items: any[]): { item: any; keptFrom: string; reason: string } {
  // Strategy: Keep highest quantity, best price, most complete info
  let best = items[0];
  let reason = "first occurrence";

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    if (item.quantity > best.quantity) {
      best = item;
      reason = `higher quantity (${item.quantity} vs ${best.quantity})`;
    } else if (item.estimatedPrice && (!best.estimatedPrice || item.estimatedPrice < best.estimatedPrice)) {
      best = item;
      reason = `better price (£${item.estimatedPrice} vs £${best.estimatedPrice || 0})`;
    }
  }

  // Combine quantities (if we want to sum them)
  // For now, let's sum quantities to ensure we don't under-buy
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  if (totalQuantity > best.quantity) {
     best = { ...best, quantity: totalQuantity };
     reason = "quantities combined";
  }

  return {
    item: best,
    keptFrom: best._sourcelist,
    reason,
  };
}