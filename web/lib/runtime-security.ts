import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

const buckets = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
}): NextResponse | null {
  const now = Date.now();
  const bucket = buckets.get(params.key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(params.key, { count: 1, resetAt: now + params.windowMs });
    return null;
  }

  if (bucket.count >= params.limit) {
    return NextResponse.json({ error: params.message ?? 'Too many requests' }, { status: 429 });
  }

  bucket.count += 1;
  return null;
}

export function safeTraceId(input: string | null): string {
  const trace = input?.trim();
  if (!trace) return crypto.randomUUID();
  return trace.slice(0, 100);
}

export function logStructured(event: string, payload: Record<string, unknown>): void {
  // Structured log for Vercel ingestion.
  console.info(JSON.stringify({ level: 'info', event, ...payload, ts: new Date().toISOString() }));
}
