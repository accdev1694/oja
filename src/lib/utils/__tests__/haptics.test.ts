import {
  isHapticsSupported,
  vibrate,
  hapticLight,
  hapticMedium,
  hapticStrong,
  hapticSuccess,
  hapticError,
  hapticSelection,
  hapticCancel,
} from '@/lib/utils/haptics';

describe('haptics', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // Reset navigator mock
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        vibrate: jest.fn(() => true),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('isHapticsSupported', () => {
    it('returns true when vibrate is available', () => {
      expect(isHapticsSupported()).toBe(true);
    });

    it('returns false when vibrate is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(isHapticsSupported()).toBe(false);
    });

    it('returns false when navigator is undefined', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(isHapticsSupported()).toBe(false);
    });
  });

  describe('vibrate', () => {
    it('calls navigator.vibrate with single duration', () => {
      vibrate(100);

      expect(navigator.vibrate).toHaveBeenCalledWith(100);
    });

    it('calls navigator.vibrate with pattern array', () => {
      vibrate([100, 50, 100]);

      expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
    });

    it('returns true on success', () => {
      expect(vibrate(100)).toBe(true);
    });

    it('returns false when not supported', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(vibrate(100)).toBe(false);
    });

    it('returns false on error', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          vibrate: jest.fn(() => {
            throw new Error('Test error');
          }),
        },
        writable: true,
        configurable: true,
      });

      expect(vibrate(100)).toBe(false);
    });
  });

  describe('hapticLight', () => {
    it('vibrates for 10ms', () => {
      hapticLight();

      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });
  });

  describe('hapticMedium', () => {
    it('vibrates with double pulse pattern', () => {
      hapticMedium();

      expect(navigator.vibrate).toHaveBeenCalledWith([15, 50, 15]);
    });
  });

  describe('hapticStrong', () => {
    it('vibrates for 30ms', () => {
      hapticStrong();

      expect(navigator.vibrate).toHaveBeenCalledWith(30);
    });
  });

  describe('hapticSuccess', () => {
    it('vibrates with ascending pattern', () => {
      hapticSuccess();

      expect(navigator.vibrate).toHaveBeenCalledWith([10, 30, 20]);
    });
  });

  describe('hapticError', () => {
    it('vibrates with repeating pattern', () => {
      hapticError();

      expect(navigator.vibrate).toHaveBeenCalledWith([20, 50, 20, 50, 20]);
    });
  });

  describe('hapticSelection', () => {
    it('vibrates for 5ms', () => {
      hapticSelection();

      expect(navigator.vibrate).toHaveBeenCalledWith(5);
    });
  });

  describe('hapticCancel', () => {
    it('cancels vibration with 0', () => {
      hapticCancel();

      expect(navigator.vibrate).toHaveBeenCalledWith(0);
    });
  });
});
