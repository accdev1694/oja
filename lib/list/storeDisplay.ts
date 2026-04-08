import type { ListItem } from "@/components/list/ShoppingListItem";

export function getStoreDisplayName(
  items: ListItem[] | undefined,
  activeStoreName: string | undefined
): string | undefined {
  const confirmed: string[] = [];
  if (items) {
    for (const item of items) {
      if (item.isChecked && item.purchasedAtStoreName && !confirmed.includes(item.purchasedAtStoreName)) {
        confirmed.push(item.purchasedAtStoreName);
      }
    }
  }

  const isConfirmed = activeStoreName && confirmed.includes(activeStoreName);
  const tentative = activeStoreName && !isConfirmed ? activeStoreName : null;

  const parts = [...confirmed];
  if (tentative) parts.push(tentative);

  if (parts.length === 0) return undefined;
  if (parts.length <= 3) return parts.join(" | ");
  return `${parts[0]} | ${parts[1]} | +${parts.length - 2} more`;
}
