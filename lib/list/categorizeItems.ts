import type { ListItem } from "@/components/list/ShoppingListItem";

export type ListHeaderData = {
  _id: string;
  isHeader: true;
  title: string;
};

export type CategorizedItem = ListItem | ListHeaderData;

export function categorizeItems(
  items: ListItem[] | undefined,
  searchTerm: string,
  showCheckedItems: boolean,
  budget: number
): {
  displayItems: CategorizedItem[];
  spent: number;
  remaining: number;
  checkedCount: number;
  estimatedTotal: number;
} {
  if (!items) return { displayItems: [], spent: 0, remaining: 0, checkedCount: 0, estimatedTotal: 0 };

  let plannedAcc = 0;
  let spentAcc = 0;
  let checkedAcc = 0;
  items.forEach((item: ListItem) => {
    plannedAcc += (item.estimatedPrice || 0) * item.quantity;
    if (item.isChecked) {
      spentAcc += (item.actualPrice || item.estimatedPrice || 0) * item.quantity;
      checkedAcc++;
    }
  });

  let filtered = items.filter((i: ListItem) =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!showCheckedItems && !searchTerm) {
    filtered = filtered.filter((i: ListItem) => !i.isChecked);
  }

  const sorted = [...filtered].sort((a, b) => {
    return (a.category || "Other").localeCompare(b.category || "Other");
  });

  const sections: CategorizedItem[] = [];
  let currentCat = "";

  sorted.forEach(item => {
    const cat = item.category || "Other";
    if (cat !== currentCat) {
      sections.push({ _id: `header-${cat}`, isHeader: true, title: cat });
      currentCat = cat;
    }
    sections.push(item);
  });

  return {
    displayItems: sections,
    spent: spentAcc,
    remaining: Math.max(0, budget - spentAcc),
    checkedCount: checkedAcc,
    estimatedTotal: plannedAcc,
  };
}
