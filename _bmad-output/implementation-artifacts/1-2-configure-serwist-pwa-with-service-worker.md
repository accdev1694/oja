# Story 1.2: Configure Serwist PWA with Service Worker

Status: ready-for-dev

## Story

**As a** user,
**I want** to install Oja as a PWA on my device,
**So that** I can access it like a native app with offline capabilities.

## Acceptance Criteria

1. **AC1**: `app/manifest.ts` exports a valid PWA manifest with app name "Oja", orange theme color (#FF6B35), and required icons (192x192, 512x512)
2. **AC2**: `src/app/sw.ts` configures the service worker with precaching for static assets
3. **AC3**: `serwist.config.ts` is properly configured for Next.js integration
4. **AC4**: Lighthouse PWA audit scores 100
5. **AC5**: The app can be installed on mobile devices via "Add to Home Screen"
6. **AC6**: The app works offline (shows cached shell)

## Tasks / Subtasks

- [ ] **Task 1: Create PWA Manifest** (AC: 1)
  - [ ] 1.1 Create `src/app/manifest.ts` with Next.js metadata API
  - [ ] 1.2 Configure app name "Oja", short_name "Oja"
  - [ ] 1.3 Set theme_color and background_color to #FF6B35 (orange brand)
  - [ ] 1.4 Set display to "standalone" for native-like experience
  - [ ] 1.5 Set start_url to "/" and scope to "/"
  - [ ] 1.6 Configure icons array with 192x192 and 512x512 sizes

- [ ] **Task 2: Create PWA Icons** (AC: 1, 5)
  - [ ] 2.1 Create `public/icons/icon-192x192.png` (Oja logo/placeholder)
  - [ ] 2.2 Create `public/icons/icon-512x512.png` (Oja logo/placeholder)
  - [ ] 2.3 Create `public/icons/apple-touch-icon.png` (180x180 for iOS)
  - [ ] 2.4 Ensure icons have orange (#FF6B35) theme

- [ ] **Task 3: Configure Serwist Service Worker** (AC: 2)
  - [ ] 3.1 Create `src/app/sw.ts` with Serwist configuration
  - [ ] 3.2 Configure precaching for static assets (JS, CSS, fonts)
  - [ ] 3.3 Configure runtime caching for app routes
  - [ ] 3.4 Set up offline fallback page

- [ ] **Task 4: Configure Serwist for Next.js** (AC: 3)
  - [ ] 4.1 Create `serwist.config.ts` at project root
  - [ ] 4.2 Update `next.config.ts` to integrate Serwist
  - [ ] 4.3 Configure service worker registration

- [ ] **Task 5: Add Offline Fallback** (AC: 6)
  - [ ] 5.1 Create `src/app/offline/page.tsx` fallback page
  - [ ] 5.2 Style offline page with Oja branding
  - [ ] 5.3 Configure service worker to serve fallback when offline

- [ ] **Task 6: Add Apple Touch Icon Meta Tags** (AC: 5)
  - [ ] 6.1 Update `src/app/layout.tsx` with Apple PWA meta tags
  - [ ] 6.2 Add apple-mobile-web-app-capable meta tag
  - [ ] 6.3 Add apple-mobile-web-app-status-bar-style meta tag

- [ ] **Task 7: Verify PWA Configuration** (AC: 4, 5, 6)
  - [ ] 7.1 Build production app with `npm run build`
  - [ ] 7.2 Serve production build and test service worker registration
  - [ ] 7.3 Run Lighthouse PWA audit and verify score 100
  - [ ] 7.4 Test "Add to Home Screen" on mobile/simulator
  - [ ] 7.5 Verify offline functionality works

## Dev Notes

### Previous Story Intelligence (Story 1.1)

**Dependencies Already Installed:**
- `@serwist/next@9.5.0` - Serwist Next.js integration
- `serwist@9.5.0` (devDependency) - Core Serwist library

**Project Structure Already Created:**
- `public/icons/` directory exists (empty)
- `src/app/` directory with layout.tsx, page.tsx, globals.css

**Build Configuration:**
- Next.js 16.1.4 with Turbopack for dev
- Production build uses Webpack (required for Serwist)

### Critical Implementation Details

#### Manifest Configuration (manifest.ts)

```typescript
// src/app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Oja',
    short_name: 'Oja',
    description: 'Budget-First Shopping Confidence',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FFFAF8',  // warm-white from design system
    theme_color: '#FF6B35',        // orange brand color
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
```

#### Service Worker Configuration (sw.ts)

```typescript
// src/app/sw.ts
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();
```

#### Serwist Config (serwist.config.ts)

```typescript
// serwist.config.ts
import type { RuntimeCaching } from '@serwist/build';

export const runtimeCaching: RuntimeCaching[] = [
  {
    urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts',
      expiration: {
        maxEntries: 4,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      },
    },
  },
  {
    urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-font-assets',
      expiration: {
        maxEntries: 4,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
      },
    },
  },
  {
    urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-image-assets',
      expiration: {
        maxEntries: 64,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  {
    urlPattern: /\.(?:js)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-js-assets',
      expiration: {
        maxEntries: 48,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
    },
  },
  {
    urlPattern: /\.(?:css|less)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-style-assets',
      expiration: {
        maxEntries: 32,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      },
    },
  },
];
```

#### Next.js Config Update (next.config.ts)

```typescript
// next.config.ts
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  // existing config...
};

export default withSerwist(nextConfig);
```

### Architecture Compliance

| Requirement | Implementation |
|-------------|----------------|
| PWA Package | Serwist (successor to next-pwa) |
| Lighthouse PWA | Target score 100 |
| Service Worker | Precaching + runtime caching |
| Offline Support | Fallback page + cached shell |
| Install Prompt | Native browser prompt |

### Design System Colors (from Architecture)

| Color | Hex | Usage |
|-------|-----|-------|
| Orange (brand) | #FF6B35 | theme_color |
| Warm White | #FFFAF8 | background_color |
| Charcoal | #2D3436 | Text color |

### PWA Icon Requirements

**Required Icons:**
- `icon-192x192.png` - Android home screen, splash screen
- `icon-512x512.png` - Android install prompt, splash screen
- `apple-touch-icon.png` - iOS home screen (180x180)

**Icon Guidelines:**
- Use orange (#FF6B35) as primary color
- Simple, recognizable design
- Maskable safe zone (inner 80% for maskable icons)
- PNG format with transparency

### Testing Requirements

1. **Production Build Test**: `npm run build` must succeed
2. **Lighthouse PWA Audit**: Score 100 on all PWA criteria
3. **Install Test**: "Add to Home Screen" works on mobile
4. **Offline Test**: App shows cached content when offline
5. **Service Worker Test**: SW registers and activates correctly

### NFRs Addressed

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR-PWA1 | Lighthouse PWA score 100 | Full Serwist config |
| NFR-PWA2 | Service Worker coverage | All critical routes cached |
| NFR-PWA5 | Cache invalidation | Version-based, 7-day stale |

### Common Pitfalls to Avoid

1. **Dev Mode**: Service workers don't work in dev mode (Serwist disabled)
2. **Turbopack**: Production builds must use Webpack for Serwist
3. **Icon Sizes**: Both 192x192 AND 512x512 required for full PWA
4. **Maskable Icons**: Use "purpose: any maskable" for Android adaptive icons
5. **iOS Safari**: Requires apple-touch-icon and specific meta tags
6. **Cache Versioning**: Service worker updates require cache busting

### Verification Commands

```bash
# Build production version
npm run build

# Serve production build for testing
npx serve out

# Or use Next.js start
npm run start

# Then open Chrome DevTools > Application > Service Workers
# And run Lighthouse PWA audit
```

### References

- [Source: architecture.md#PWA-Strategy]
- [Source: architecture.md#Starter-Template-Evaluation]
- [Source: epics.md#Story-1.2]
- [Serwist Documentation: https://serwist.pages.dev/]
- [Next.js PWA: https://nextjs.org/docs/app/building-your-application/configuring/progressive-web-apps]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

