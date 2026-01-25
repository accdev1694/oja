# Story 2.8: Location Permission Request

Status: review

## Story

As a **new user**,
I want **to optionally enable location services**,
So that **Oja can auto-detect my currency and nearby stores**.

## Acceptance Criteria

1. **Clear explanation displayed** of why location is useful (currency detection, store proximity)
2. **One-tap permission grant** via system prompt
3. **"Maybe Later" option** allows skipping (FR88, FR89)
4. **Country/currency auto-detected** if permission granted
5. **Graceful handling** if permission denied
6. **Animations respect** prefers-reduced-motion (NFR-A6)
7. **Touch targets 44x44px** minimum (NFR-A4)

## Tasks / Subtasks

- [x] **Task 1: Create LocationPermission Component** (AC: #1, #2, #3, #6, #7)
  - [x] Create `src/components/onboarding/LocationPermission.tsx`
  - [x] Display icon and explanation of location benefits
  - [x] "Enable Location" primary button (44px+ touch target)
  - [x] "Maybe Later" secondary button/link
  - [x] Framer Motion animations (respect reduced motion)

- [x] **Task 2: Implement Geolocation API Integration** (AC: #2, #4, #5)
  - [x] Create `src/lib/hooks/useGeolocation.ts` hook
  - [x] Request permission via `navigator.geolocation.getCurrentPosition`
  - [x] Handle success, error, and denied states
  - [x] Detect country from locale (reverse geocoding would require external API)

- [x] **Task 3: Currency Detection Logic** (AC: #4)
  - [x] Create `src/lib/utils/currencyDetection.ts`
  - [x] Map 50+ country codes to currencies
  - [x] Default to GBP for UK market (primary target)
  - [x] Store detected currency in localStorage

- [x] **Task 4: Create Location Permission Page** (AC: #1, #3)
  - [x] Create `src/app/(onboarding)/location/page.tsx`
  - [x] Display LocationPermission component
  - [x] Handle permission result and navigate to next step
  - [x] Budget page updated to navigate here

- [x] **Task 5: Update Navigation Flow** (AC: #3)
  - [x] Budget page navigates to `/location` on confirm/skip
  - [x] Location page navigates to `/complete` (Story 2-9)

- [x] **Task 6: Add Tests** (AC: all)
  - [x] Unit tests for LocationPermission component (11 tests)
  - [x] Unit tests for useGeolocation hook (12 tests)
  - [x] Unit tests for currency detection utility (32 tests)
  - [x] Test skip functionality

- [x] **Task 7: Run build and verify** - All 258 tests passing, build successful

## Dev Notes

### Architecture Compliance

**From Architecture Document:**
- Hooks in `src/lib/hooks/` directory
- Utilities in `src/lib/utils/` directory
- Use Framer Motion for animations
- Respect `prefers-reduced-motion` media query
- Touch targets 44x44px minimum

### UX Design Requirements

**From UX Specification:**
- Location is optional (FR88, FR89)
- Clear value proposition for enabling
- No pressure - "Maybe Later" is prominent
- Graceful degradation if denied

### Geolocation API Pattern

```typescript
// src/lib/hooks/useGeolocation.ts
interface GeolocationState {
  loading: boolean;
  error: GeolocationPositionError | null;
  position: GeolocationPosition | null;
  permissionState: 'prompt' | 'granted' | 'denied' | null;
}

const useGeolocation = () => {
  // Request permission and get position
  const requestLocation = async () => {
    if (!('geolocation' in navigator)) {
      return { error: 'Geolocation not supported' };
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      });
    });
  };

  return { requestLocation, ...state };
};
```

### Currency Detection Pattern

```typescript
// src/lib/utils/currencyDetection.ts
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  GB: 'GBP',
  US: 'USD',
  EU: 'EUR', // Eurozone
  CA: 'CAD',
  AU: 'AUD',
  // Add more as needed
};

const detectCurrencyFromCountry = (countryCode: string): string => {
  return COUNTRY_CURRENCY_MAP[countryCode] || 'GBP'; // Default to GBP
};
```

### Country Detection Options

1. **Reverse Geocoding** (if position granted):
   - Use free API like BigDataCloud or OpenCage
   - Or use browser's Intl API with locale

2. **IP-based Fallback** (if location denied):
   - Use free API like ip-api.com
   - Less accurate but works without permission

3. **Manual Selection** (always available):
   - Allow user to select country/currency in settings

### Previous Story Learnings (2-7)

- Use `useReducedMotion` from framer-motion for accessibility
- localStorage works as placeholder for Supabase integration
- Onboarding pages are under `(onboarding)` route group
- Export components from `src/components/onboarding/index.ts`
- Test files go in `__tests__` folder adjacent to component

### File Structure

```
src/
├── components/
│   └── onboarding/
│       ├── LocationPermission.tsx     # NEW
│       ├── __tests__/
│       │   └── LocationPermission.test.tsx # NEW
│       └── index.ts                   # UPDATE (add export)
├── lib/
│   ├── hooks/
│   │   └── useGeolocation.ts          # NEW
│   └── utils/
│       └── currencyDetection.ts       # NEW
├── app/
│   └── (onboarding)/
│       ├── location/
│       │   └── page.tsx               # NEW
│       └── budget/
│           └── page.tsx               # UPDATE (navigation)
```

### localStorage Keys

```typescript
const LOCATION_STORAGE_KEY = 'oja_location_granted';
const CURRENCY_STORAGE_KEY = 'oja_currency';
const COUNTRY_STORAGE_KEY = 'oja_country';
```

### Accessibility Requirements

- Clear explanation text with proper heading hierarchy
- Button labels describe action clearly
- Loading state announced to screen readers
- Error messages accessible
- Focus management after permission result

### References

- [Source: epics.md#Story-2.8] - Acceptance criteria
- [Source: architecture.md] - Hook and utility patterns
- [Source: ux-design-specification.md] - Optional permissions guidance
- [Source: stories/2-7-budget-setting-with-haptic-dial.md] - Previous story patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

- Created LocationPermission component with location benefits explanation
- Three benefits displayed: currency detection, store finding, shopping mode
- useGeolocation hook wraps Geolocation API with proper error handling
- Currency detection supports 50+ countries with proper currency mapping
- Locale-based detection as fallback (uses navigator.language)
- Permission denied state shows friendly message with Continue option
- Budget page now navigates to /location instead of /pantry
- Location page navigates to /complete for Story 2-9
- 55 new tests across component, hook, and utility
- All 258 tests passing, production build successful

### File List

- `src/components/onboarding/LocationPermission.tsx` (NEW)
- `src/components/onboarding/__tests__/LocationPermission.test.tsx` (NEW)
- `src/components/onboarding/index.ts` (UPDATED - added LocationPermission export)
- `src/lib/hooks/useGeolocation.ts` (NEW)
- `src/lib/hooks/__tests__/useGeolocation.test.ts` (NEW)
- `src/lib/utils/currencyDetection.ts` (NEW)
- `src/lib/utils/__tests__/currencyDetection.test.ts` (NEW)
- `src/app/(onboarding)/location/page.tsx` (NEW)
- `src/app/(onboarding)/budget/page.tsx` (UPDATED - navigation to /location)

