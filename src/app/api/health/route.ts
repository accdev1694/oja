import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 *
 * Used by:
 * - Vercel monitoring
 * - Load balancers
 * - Uptime monitoring services
 *
 * Returns basic health status and optional service checks
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database?: 'connected' | 'disconnected' | 'unknown';
    cache?: 'connected' | 'disconnected' | 'unknown';
  };
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const timestamp = new Date().toISOString();
  const version = process.env.npm_package_version || '0.1.0';
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';

  // Basic health check - always returns healthy for now
  // In production, you would add service connectivity checks here
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp,
    version,
    environment,
    services: {
      database: 'unknown', // TODO: Add Supabase connectivity check
      cache: 'unknown', // TODO: Add Redis/cache check if implemented
    },
  };

  return NextResponse.json(healthStatus, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

// Prevent caching of health check responses
export const dynamic = 'force-dynamic';
