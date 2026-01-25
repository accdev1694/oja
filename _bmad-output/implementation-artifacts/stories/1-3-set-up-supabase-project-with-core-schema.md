# Story 1.3: Set Up Supabase Project with Core Schema

## Story

- **ID**: 1-3
- **Epic**: Epic 1 - Project Foundation & PWA Setup
- **Title**: Set Up Supabase Project with Core Schema
- **Status**: ready-for-dev

## Description

As a developer, I want a Supabase project with the core database schema, so that I have authentication and data storage ready for feature development.

## Acceptance Criteria

- [ ] `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `lib/supabase/client.ts` exports a browser Supabase client
- [ ] `lib/supabase/server.ts` exports a server Supabase client using cookies
- [ ] `middleware.ts` handles session refresh for authenticated routes
- [ ] Supabase Auth is configured with email/password provider
- [ ] Initial migration creates `profiles` table with RLS policies
- [ ] TypeScript types are generated from the database schema

## Technical Notes

### Supabase Project Setup

This story focuses on setting up the Supabase client-side integration and database foundation. The actual Supabase project should be created in the Supabase dashboard first.

### Dependencies

The following packages are already installed:
- `@supabase/supabase-js` - Core Supabase client
- `@supabase/ssr` - Server-side rendering support for Next.js

### File Structure

```
src/
├── lib/
│   └── supabase/
│       ├── client.ts      # Browser client (singleton)
│       ├── server.ts      # Server client (per-request)
│       └── middleware.ts  # Session refresh helper
├── middleware.ts          # Next.js middleware
└── types/
    └── supabase.ts        # Generated types
supabase/
└── migrations/
    └── 00001_create_profiles.sql
```

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Profiles Table Schema

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Tasks

### Task 1: Create Environment Configuration Template
**File**: `.env.local.example`

Create an example environment file documenting required Supabase variables:

```env
# Supabase Configuration
# Get these values from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: For server-side operations requiring elevated privileges
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Task 2: Create Browser Supabase Client
**File**: `src/lib/supabase/client.ts`

Create a singleton browser client for client-side operations:

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Task 3: Create Server Supabase Client
**File**: `src/lib/supabase/server.ts`

Create a per-request server client using cookies:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}
```

### Task 4: Create Middleware Helper
**File**: `src/lib/supabase/middleware.ts`

Create a helper function for session refresh in middleware:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make your application
  // vulnerable to security issues.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define protected routes that require authentication
  const protectedRoutes = ['/pantry', '/list', '/scan', '/insights', '/settings'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    // Redirect unauthenticated users to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: Return the supabaseResponse object to ensure session cookies
  // are properly handled
  return supabaseResponse;
}
```

### Task 5: Create Next.js Middleware
**File**: `src/middleware.ts`

Create the root middleware that handles session refresh:

```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, icons, etc.)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Task 6: Create Database Types Placeholder
**File**: `src/types/supabase.ts`

Create a placeholder types file (to be generated from Supabase):

```typescript
// This file should be regenerated using the Supabase CLI:
// npx supabase gen types typescript --project-id <project-id> > src/types/supabase.ts
//
// For local development with Supabase CLI:
// npx supabase gen types typescript --local > src/types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Helper types for easier usage
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Convenience type aliases
export type Profile = Tables<'profiles'>;
export type ProfileInsert = Insertable<'profiles'>;
export type ProfileUpdate = Updatable<'profiles'>;
```

### Task 7: Create Initial Database Migration
**File**: `supabase/migrations/00001_create_profiles.sql`

Create the profiles table migration with RLS policies:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile (for manual creation if needed)
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### Task 8: Verify Configuration
**Verification Steps**:

1. Build succeeds with Supabase client imports
2. TypeScript compiles without errors
3. Middleware configuration is valid
4. ESLint passes

**Test Commands**:
```bash
npm run build
npm run lint
```

## Dev Notes

- The actual Supabase project must be created in the Supabase dashboard
- Email/password auth is enabled by default in new Supabase projects
- The migration file is ready to be applied via `supabase db push` or Supabase dashboard
- Types should be regenerated after applying migrations: `npx supabase gen types typescript`
- For local development, use `npx supabase start` to run a local instance

## Story Wrap-Up

### Completion Checklist
- [ ] All acceptance criteria met
- [ ] Code builds without errors
- [ ] Lint passes
- [ ] Changes committed with descriptive message
- [ ] Sprint status updated
