import { renderHook, act } from '@testing-library/react';
import { useGeolocation } from '@/lib/hooks/useGeolocation';

// Mock navigator.geolocation
const mockGetCurrentPosition = jest.fn();
const mockGeolocation = {
  getCurrentPosition: mockGetCurrentPosition,
};

// Mock navigator.permissions
const mockPermissionsQuery = jest.fn();

describe('useGeolocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup geolocation mock
    Object.defineProperty(global.navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
    });

    // Setup permissions mock
    Object.defineProperty(global.navigator, 'permissions', {
      value: { query: mockPermissionsQuery },
      configurable: true,
    });
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useGeolocation());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.position).toBe(null);
    expect(result.current.permissionState).toBe(null);
    expect(result.current.isSupported).toBe(true);
  });

  it('returns isSupported as true when geolocation exists', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.isSupported).toBe(true);
  });

  it('sets loading to true when requesting location', async () => {
    mockGetCurrentPosition.mockImplementation(() => {
      // Don't resolve to keep loading state
    });

    const { result } = renderHook(() => useGeolocation());

    act(() => {
      result.current.requestLocation();
    });

    expect(result.current.loading).toBe(true);
  });

  it('returns position on successful geolocation', async () => {
    const mockPosition = {
      coords: {
        latitude: 51.5074,
        longitude: -0.1278,
        accuracy: 100,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    mockGetCurrentPosition.mockImplementation((success) => {
      success(mockPosition);
    });

    const { result } = renderHook(() => useGeolocation());

    let position: GeolocationPosition | null = null;
    await act(async () => {
      position = await result.current.requestLocation();
    });

    expect(position).toEqual(mockPosition);
    expect(result.current.position).toEqual(mockPosition);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.permissionState).toBe('granted');
  });

  it('handles permission denied error', async () => {
    const mockError = {
      code: 1, // PERMISSION_DENIED
      message: 'User denied Geolocation',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGetCurrentPosition.mockImplementation((_, error) => {
      error(mockError);
    });

    const { result } = renderHook(() => useGeolocation());

    let position: GeolocationPosition | null = null;
    await act(async () => {
      position = await result.current.requestLocation();
    });

    expect(position).toBe(null);
    expect(result.current.error).toBe('Location permission was denied');
    expect(result.current.loading).toBe(false);
    expect(result.current.permissionState).toBe('denied');
  });

  it('handles position unavailable error', async () => {
    const mockError = {
      code: 2, // POSITION_UNAVAILABLE
      message: 'Position unavailable',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGetCurrentPosition.mockImplementation((_, error) => {
      error(mockError);
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.requestLocation();
    });

    expect(result.current.error).toBe('Location information is unavailable');
    expect(result.current.loading).toBe(false);
  });

  it('handles timeout error', async () => {
    const mockError = {
      code: 3, // TIMEOUT
      message: 'Timeout',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    mockGetCurrentPosition.mockImplementation((_, error) => {
      error(mockError);
    });

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await result.current.requestLocation();
    });

    expect(result.current.error).toBe('Location request timed out');
    expect(result.current.loading).toBe(false);
  });

  it('checks permission state', async () => {
    mockPermissionsQuery.mockResolvedValue({ state: 'granted' });

    const { result } = renderHook(() => useGeolocation());

    let state: PermissionState | null = null;
    await act(async () => {
      state = await result.current.checkPermission();
    });

    expect(state).toBe('granted');
    expect(result.current.permissionState).toBe('granted');
  });

  it('handles permissions API not supported', async () => {
    mockPermissionsQuery.mockRejectedValue(new Error('Not supported'));

    const { result } = renderHook(() => useGeolocation());

    let state: PermissionState | null = null;
    await act(async () => {
      state = await result.current.checkPermission();
    });

    expect(state).toBe(null);
  });
});

// Note: Testing "geolocation not supported" scenario is complex in JSDOM
// because navigator.geolocation is already defined. These edge cases
// would be better tested in E2E tests with actual browser environments.
// The hook does handle this case in production.
