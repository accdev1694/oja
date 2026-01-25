import {
  STOCK_LEVEL_CONFIG,
  getStockLevelColor,
  getStockLevelBgColor,
  getStockLevelLabel,
  getStockLevelDescription,
  getStockLevelFillPercent,
  STOCK_LEVEL_ORDER,
  sortByStockLevel,
  needsAttention,
  countByStockLevel,
  decreaseStockLevel,
  increaseStockLevel,
  canDecreaseStock,
} from '@/lib/utils/stockLevel';
import { type StockLevel } from '@/lib/utils/onboardingStorage';

describe('stockLevel utilities', () => {
  describe('STOCK_LEVEL_CONFIG', () => {
    it('defines config for all stock levels', () => {
      expect(STOCK_LEVEL_CONFIG.stocked).toBeDefined();
      expect(STOCK_LEVEL_CONFIG.good).toBeDefined();
      expect(STOCK_LEVEL_CONFIG.low).toBeDefined();
      expect(STOCK_LEVEL_CONFIG.out).toBeDefined();
    });

    it('includes required properties for each level', () => {
      const levels: StockLevel[] = ['stocked', 'good', 'low', 'out'];

      for (const level of levels) {
        expect(STOCK_LEVEL_CONFIG[level]).toHaveProperty('color');
        expect(STOCK_LEVEL_CONFIG[level]).toHaveProperty('bgColor');
        expect(STOCK_LEVEL_CONFIG[level]).toHaveProperty('label');
        expect(STOCK_LEVEL_CONFIG[level]).toHaveProperty('description');
      }
    });
  });

  describe('getStockLevelColor', () => {
    it('returns color for stocked level', () => {
      expect(getStockLevelColor('stocked')).toBe(
        'var(--color-safe-zone-green)'
      );
    });

    it('returns color for good level', () => {
      expect(getStockLevelColor('good')).toBe('#3B82F6');
    });

    it('returns color for low level', () => {
      expect(getStockLevelColor('low')).toBe('var(--color-warning)');
    });

    it('returns color for out level', () => {
      expect(getStockLevelColor('out')).toBe('var(--color-danger)');
    });
  });

  describe('getStockLevelBgColor', () => {
    it('returns background color for each level', () => {
      expect(getStockLevelBgColor('stocked')).toContain('rgba');
      expect(getStockLevelBgColor('good')).toContain('rgba');
      expect(getStockLevelBgColor('low')).toContain('rgba');
      expect(getStockLevelBgColor('out')).toContain('rgba');
    });
  });

  describe('getStockLevelLabel', () => {
    it('returns human-readable labels', () => {
      expect(getStockLevelLabel('stocked')).toBe('Stocked');
      expect(getStockLevelLabel('good')).toBe('Good');
      expect(getStockLevelLabel('low')).toBe('Low');
      expect(getStockLevelLabel('out')).toBe('Out');
    });
  });

  describe('getStockLevelDescription', () => {
    it('returns descriptions for each level', () => {
      expect(getStockLevelDescription('stocked')).toBe('Plenty in stock');
      expect(getStockLevelDescription('good')).toBe('Sufficient stock');
      expect(getStockLevelDescription('low')).toBe('Running low');
      expect(getStockLevelDescription('out')).toBe('Need to buy');
    });
  });

  describe('getStockLevelFillPercent', () => {
    it('returns 100% for stocked', () => {
      expect(getStockLevelFillPercent('stocked')).toBe(100);
    });

    it('returns 75% for good', () => {
      expect(getStockLevelFillPercent('good')).toBe(75);
    });

    it('returns 25% for low', () => {
      expect(getStockLevelFillPercent('low')).toBe(25);
    });

    it('returns 0% for out', () => {
      expect(getStockLevelFillPercent('out')).toBe(0);
    });
  });

  describe('STOCK_LEVEL_ORDER', () => {
    it('orders levels from most urgent to least', () => {
      expect(STOCK_LEVEL_ORDER).toEqual(['out', 'low', 'good', 'stocked']);
    });
  });

  describe('sortByStockLevel', () => {
    it('sorts items with out items first', () => {
      const items = [
        { id: '1', level: 'stocked' as StockLevel },
        { id: '2', level: 'out' as StockLevel },
        { id: '3', level: 'good' as StockLevel },
        { id: '4', level: 'low' as StockLevel },
      ];

      const sorted = sortByStockLevel(items);

      expect(sorted[0].level).toBe('out');
      expect(sorted[1].level).toBe('low');
      expect(sorted[2].level).toBe('good');
      expect(sorted[3].level).toBe('stocked');
    });

    it('does not mutate original array', () => {
      const items = [
        { id: '1', level: 'stocked' as StockLevel },
        { id: '2', level: 'out' as StockLevel },
      ];
      const original = [...items];

      sortByStockLevel(items);

      expect(items).toEqual(original);
    });

    it('handles empty array', () => {
      expect(sortByStockLevel([])).toEqual([]);
    });

    it('handles single item', () => {
      const items = [{ id: '1', level: 'stocked' as StockLevel }];
      expect(sortByStockLevel(items)).toEqual(items);
    });
  });

  describe('needsAttention', () => {
    it('returns true for out items', () => {
      expect(needsAttention('out')).toBe(true);
    });

    it('returns true for low items', () => {
      expect(needsAttention('low')).toBe(true);
    });

    it('returns false for good items', () => {
      expect(needsAttention('good')).toBe(false);
    });

    it('returns false for stocked items', () => {
      expect(needsAttention('stocked')).toBe(false);
    });
  });

  describe('countByStockLevel', () => {
    it('counts items by stock level', () => {
      const items = [
        { id: '1', level: 'stocked' as StockLevel },
        { id: '2', level: 'stocked' as StockLevel },
        { id: '3', level: 'good' as StockLevel },
        { id: '4', level: 'low' as StockLevel },
        { id: '5', level: 'out' as StockLevel },
        { id: '6', level: 'out' as StockLevel },
      ];

      const counts = countByStockLevel(items);

      expect(counts.stocked).toBe(2);
      expect(counts.good).toBe(1);
      expect(counts.low).toBe(1);
      expect(counts.out).toBe(2);
    });

    it('returns zeros for empty array', () => {
      const counts = countByStockLevel([]);

      expect(counts.stocked).toBe(0);
      expect(counts.good).toBe(0);
      expect(counts.low).toBe(0);
      expect(counts.out).toBe(0);
    });

    it('handles single level items', () => {
      const items = [
        { id: '1', level: 'low' as StockLevel },
        { id: '2', level: 'low' as StockLevel },
      ];

      const counts = countByStockLevel(items);

      expect(counts.stocked).toBe(0);
      expect(counts.good).toBe(0);
      expect(counts.low).toBe(2);
      expect(counts.out).toBe(0);
    });
  });

  describe('decreaseStockLevel', () => {
    it('decreases stocked to good', () => {
      expect(decreaseStockLevel('stocked')).toBe('good');
    });

    it('decreases good to low', () => {
      expect(decreaseStockLevel('good')).toBe('low');
    });

    it('decreases low to out', () => {
      expect(decreaseStockLevel('low')).toBe('out');
    });

    it('returns null when already at out', () => {
      expect(decreaseStockLevel('out')).toBe(null);
    });
  });

  describe('increaseStockLevel', () => {
    it('increases out to low', () => {
      expect(increaseStockLevel('out')).toBe('low');
    });

    it('increases low to good', () => {
      expect(increaseStockLevel('low')).toBe('good');
    });

    it('increases good to stocked', () => {
      expect(increaseStockLevel('good')).toBe('stocked');
    });

    it('returns null when already at stocked', () => {
      expect(increaseStockLevel('stocked')).toBe(null);
    });
  });

  describe('canDecreaseStock', () => {
    it('returns true for stocked', () => {
      expect(canDecreaseStock('stocked')).toBe(true);
    });

    it('returns true for good', () => {
      expect(canDecreaseStock('good')).toBe(true);
    });

    it('returns true for low', () => {
      expect(canDecreaseStock('low')).toBe(true);
    });

    it('returns false for out', () => {
      expect(canDecreaseStock('out')).toBe(false);
    });
  });
});
