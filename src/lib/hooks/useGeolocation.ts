'use client';

import { useState, useCallback } from 'react';

export interface GeolocationState {
  loading: boolean;
  error: string | null;
  position: GeolocationPosition | null;
  permissionState: PermissionState | null;
}

export interface UseGeolocationReturn extends GeolocationState {
  requestLocation: () => Promise<GeolocationPosition | null>;
  checkPermission: () => Promise<PermissionState | null>;
  isSupported: boolean;
}

/**
 * Hook for accessing the Geolocation API
 *
 * Provides methods to:
 * - Check if geolocation is supported
 * - Check current permission state
 * - Request location permission and get position
 */
export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    position: null,
    permissionState: null,
  });

  const isSupported =
    typeof window !== 'undefined' && 'geolocation' in navigator;

  /**
   * Check current permission state without prompting
   */
  const checkPermission =
    useCallback(async (): Promise<PermissionState | null> => {
      if (typeof window === 'undefined' || !('permissions' in navigator)) {
        return null;
      }

      try {
        const result = await navigator.permissions.query({
          name: 'geolocation',
        });
        setState((prev) => ({ ...prev, permissionState: result.state }));
        return result.state;
      } catch {
        // Permissions API not supported in this browser
        return null;
      }
    }, []);

  /**
   * Request location permission and get current position
   */
  const requestLocation =
    useCallback(async (): Promise<GeolocationPosition | null> => {
      if (!isSupported) {
        setState((prev) => ({
          ...prev,
          error: 'Geolocation is not supported by your browser',
        }));
        return null;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 300000, // 5 minutes cache
            });
          }
        );

        setState({
          loading: false,
          error: null,
          position,
          permissionState: 'granted',
        });

        return position;
      } catch (err) {
        const error = err as GeolocationPositionError;
        let errorMessage: string;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission was denied';
            setState((prev) => ({
              ...prev,
              loading: false,
              error: errorMessage,
              permissionState: 'denied',
            }));
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            setState((prev) => ({
              ...prev,
              loading: false,
              error: errorMessage,
            }));
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            setState((prev) => ({
              ...prev,
              loading: false,
              error: errorMessage,
            }));
            break;
          default:
            errorMessage = 'An unknown error occurred';
            setState((prev) => ({
              ...prev,
              loading: false,
              error: errorMessage,
            }));
        }

        return null;
      }
    }, [isSupported]);

  return {
    ...state,
    requestLocation,
    checkPermission,
    isSupported,
  };
}
