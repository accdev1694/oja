import { renderHook, act } from '@testing-library/react';
import { useLongPress } from '@/lib/hooks/useLongPress';

describe('useLongPress', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic functionality', () => {
    it('returns event handlers', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useLongPress(callback));

      expect(result.current.onMouseDown).toBeDefined();
      expect(result.current.onMouseUp).toBeDefined();
      expect(result.current.onMouseLeave).toBeDefined();
      expect(result.current.onTouchStart).toBeDefined();
      expect(result.current.onTouchEnd).toBeDefined();
      expect(result.current.onTouchMove).toBeDefined();
    });

    it('does not call callback immediately on mouse down', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useLongPress(callback));

      act(() => {
        result.current.onMouseDown({
          button: 0,
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('calls callback after threshold on mouse', () => {
      const callback = jest.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { threshold: 500 })
      );

      act(() => {
        result.current.onMouseDown({
          button: 0,
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('does not call callback if released before threshold', () => {
      const callback = jest.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { threshold: 500 })
      );

      act(() => {
        result.current.onMouseDown({
          button: 0,
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      act(() => {
        result.current.onMouseUp();
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Touch events', () => {
    it('calls callback after threshold on touch', () => {
      const callback = jest.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { threshold: 500 })
      );

      act(() => {
        result.current.onTouchStart({
          touches: [{ clientX: 100, clientY: 100 }],
        } as unknown as React.TouchEvent);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('cancels on touch end before threshold', () => {
      const callback = jest.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { threshold: 500 })
      );

      act(() => {
        result.current.onTouchStart({
          touches: [{ clientX: 100, clientY: 100 }],
        } as unknown as React.TouchEvent);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      act(() => {
        result.current.onTouchEnd();
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('cancels when touch moves beyond threshold', () => {
      const callback = jest.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { threshold: 500, moveThreshold: 10 })
      );

      act(() => {
        result.current.onTouchStart({
          touches: [{ clientX: 100, clientY: 100 }],
        } as unknown as React.TouchEvent);
      });

      act(() => {
        result.current.onTouchMove({
          touches: [{ clientX: 120, clientY: 100 }],
        } as unknown as React.TouchEvent);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Mouse button handling', () => {
    it('ignores right click', () => {
      const callback = jest.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { threshold: 500 })
      );

      act(() => {
        result.current.onMouseDown({
          button: 2,
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('cancels on mouse leave', () => {
      const callback = jest.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { threshold: 500 })
      );

      act(() => {
        result.current.onMouseDown({
          button: 0,
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      act(() => {
        result.current.onMouseLeave();
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('calls onStart when press begins', () => {
      const callback = jest.fn();
      const onStart = jest.fn();
      const { result } = renderHook(() => useLongPress(callback, { onStart }));

      act(() => {
        result.current.onMouseDown({
          button: 0,
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('calls onFinish when long press completes', () => {
      const callback = jest.fn();
      const onFinish = jest.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { threshold: 500, onFinish })
      );

      act(() => {
        result.current.onMouseDown({
          button: 0,
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onFinish).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when press is cancelled', () => {
      const callback = jest.fn();
      const onCancel = jest.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { threshold: 500, onCancel })
      );

      act(() => {
        result.current.onMouseDown({
          button: 0,
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      act(() => {
        result.current.onMouseUp();
      });

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Default options', () => {
    it('uses default threshold of 500ms', () => {
      const callback = jest.fn();
      const { result } = renderHook(() => useLongPress(callback));

      act(() => {
        result.current.onMouseDown({
          button: 0,
          clientX: 100,
          clientY: 100,
        } as React.MouseEvent);
      });

      act(() => {
        jest.advanceTimersByTime(499);
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
