import { renderHook, act } from '@testing-library/react';
import { useSwipe } from '@/lib/hooks/useSwipe';

describe('useSwipe', () => {
  const createTouchEvent = (clientX: number, clientY: number = 0) => ({
    touches: [{ clientX, clientY }],
    preventDefault: jest.fn(),
  });

  describe('initial state', () => {
    it('returns zero offset initially', () => {
      const { result } = renderHook(() => useSwipe());

      expect(result.current.swipeOffset).toBe(0);
    });

    it('returns isSwiping false initially', () => {
      const { result } = renderHook(() => useSwipe());

      expect(result.current.isSwiping).toBe(false);
    });

    it('returns swipeDirection null initially', () => {
      const { result } = renderHook(() => useSwipe());

      expect(result.current.swipeDirection).toBe(null);
    });

    it('returns all touch handlers', () => {
      const { result } = renderHook(() => useSwipe());

      expect(typeof result.current.onTouchStart).toBe('function');
      expect(typeof result.current.onTouchMove).toBe('function');
      expect(typeof result.current.onTouchEnd).toBe('function');
    });
  });

  describe('touch start', () => {
    it('sets isSwiping to true on touch start', () => {
      const { result } = renderHook(() => useSwipe());

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100) as unknown as React.TouchEvent
        );
      });

      expect(result.current.isSwiping).toBe(true);
    });

    it('does not start swipe when disabled', () => {
      const { result } = renderHook(() => useSwipe({ disabled: true }));

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100) as unknown as React.TouchEvent
        );
      });

      expect(result.current.isSwiping).toBe(false);
    });
  });

  describe('touch move', () => {
    it('updates swipeOffset during horizontal movement', () => {
      const { result } = renderHook(() => useSwipe());

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchMove(
          createTouchEvent(60, 50) as unknown as React.TouchEvent
        );
      });

      expect(result.current.swipeOffset).toBe(-40);
    });

    it('sets swipeDirection to left for negative offset', () => {
      const { result } = renderHook(() => useSwipe());

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchMove(
          createTouchEvent(60, 50) as unknown as React.TouchEvent
        );
      });

      expect(result.current.swipeDirection).toBe('left');
    });

    it('sets swipeDirection to right for positive offset', () => {
      const { result } = renderHook(() => useSwipe());

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchMove(
          createTouchEvent(160, 50) as unknown as React.TouchEvent
        );
      });

      expect(result.current.swipeDirection).toBe('right');
    });

    it('cancels swipe if vertical movement is greater', () => {
      const { result } = renderHook(() => useSwipe());

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        // Move more vertically than horizontally
        result.current.onTouchMove(
          createTouchEvent(105, 100) as unknown as React.TouchEvent
        );
      });

      expect(result.current.isSwiping).toBe(false);
      expect(result.current.swipeOffset).toBe(0);
    });

    it('ignores small movements', () => {
      const { result } = renderHook(() => useSwipe());

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        // Move less than 10px
        result.current.onTouchMove(
          createTouchEvent(105, 52) as unknown as React.TouchEvent
        );
      });

      // Offset should be 0 because direction not determined yet
      expect(result.current.swipeOffset).toBe(0);
    });

    it('does not update when disabled', () => {
      const { result } = renderHook(() => useSwipe({ disabled: true }));

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
        result.current.onTouchMove(
          createTouchEvent(60, 50) as unknown as React.TouchEvent
        );
      });

      expect(result.current.swipeOffset).toBe(0);
    });
  });

  describe('touch end - swipe left', () => {
    it('calls onSwipeLeft when threshold exceeded', () => {
      const onSwipeLeft = jest.fn();
      const { result } = renderHook(() =>
        useSwipe({ threshold: 50, onSwipeLeft })
      );

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchMove(
          createTouchEvent(40, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchEnd();
      });

      expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it('does not call onSwipeLeft when threshold not exceeded', () => {
      const onSwipeLeft = jest.fn();
      const { result } = renderHook(() =>
        useSwipe({ threshold: 50, onSwipeLeft })
      );

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchMove(
          createTouchEvent(70, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchEnd();
      });

      expect(onSwipeLeft).not.toHaveBeenCalled();
    });

    it('uses default threshold of 50px', () => {
      const onSwipeLeft = jest.fn();
      const { result } = renderHook(() => useSwipe({ onSwipeLeft }));

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchMove(
          createTouchEvent(50, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchEnd();
      });

      expect(onSwipeLeft).toHaveBeenCalled();
    });
  });

  describe('touch end - swipe right', () => {
    it('calls onSwipeRight when threshold exceeded', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipe({ threshold: 50, onSwipeRight })
      );

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchMove(
          createTouchEvent(160, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchEnd();
      });

      expect(onSwipeRight).toHaveBeenCalledTimes(1);
    });

    it('does not call onSwipeRight when threshold not exceeded', () => {
      const onSwipeRight = jest.fn();
      const { result } = renderHook(() =>
        useSwipe({ threshold: 50, onSwipeRight })
      );

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchMove(
          createTouchEvent(130, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchEnd();
      });

      expect(onSwipeRight).not.toHaveBeenCalled();
    });
  });

  describe('reset behavior', () => {
    it('resets state after touch end', () => {
      const { result } = renderHook(() => useSwipe());

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchMove(
          createTouchEvent(60, 50) as unknown as React.TouchEvent
        );
      });

      expect(result.current.isSwiping).toBe(true);
      expect(result.current.swipeOffset).toBe(-40);
      expect(result.current.swipeDirection).toBe('left');

      act(() => {
        result.current.onTouchEnd();
      });

      expect(result.current.isSwiping).toBe(false);
      expect(result.current.swipeOffset).toBe(0);
      expect(result.current.swipeDirection).toBe(null);
    });
  });

  describe('custom threshold', () => {
    it('respects custom threshold value', () => {
      const onSwipeLeft = jest.fn();
      const { result } = renderHook(() =>
        useSwipe({ threshold: 100, onSwipeLeft })
      );

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(200, 50) as unknown as React.TouchEvent
        );
      });

      // Move 80px - should not trigger with 100px threshold
      act(() => {
        result.current.onTouchMove(
          createTouchEvent(120, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchEnd();
      });

      expect(onSwipeLeft).not.toHaveBeenCalled();

      // Now move 110px - should trigger
      act(() => {
        result.current.onTouchStart(
          createTouchEvent(200, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchMove(
          createTouchEvent(90, 50) as unknown as React.TouchEvent
        );
      });

      act(() => {
        result.current.onTouchEnd();
      });

      expect(onSwipeLeft).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles touch move without touch start', () => {
      const { result } = renderHook(() => useSwipe());

      // Should not throw
      act(() => {
        result.current.onTouchMove(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      expect(result.current.swipeOffset).toBe(0);
    });

    it('handles touch end without touch start', () => {
      const onSwipeLeft = jest.fn();
      const { result } = renderHook(() => useSwipe({ onSwipeLeft }));

      // Should not throw or call callback
      act(() => {
        result.current.onTouchEnd();
      });

      expect(onSwipeLeft).not.toHaveBeenCalled();
    });

    it('handles empty touches array', () => {
      const { result } = renderHook(() => useSwipe());

      // Should not throw
      act(() => {
        result.current.onTouchStart({
          touches: [],
        } as unknown as React.TouchEvent);
      });

      expect(result.current.isSwiping).toBe(false);
    });

    it('handles touch move with empty touches', () => {
      const { result } = renderHook(() => useSwipe());

      act(() => {
        result.current.onTouchStart(
          createTouchEvent(100, 50) as unknown as React.TouchEvent
        );
      });

      // Should not throw
      act(() => {
        result.current.onTouchMove({
          touches: [],
          preventDefault: jest.fn(),
        } as unknown as React.TouchEvent);
      });

      // Offset should remain 0
      expect(result.current.swipeOffset).toBe(0);
    });
  });
});
