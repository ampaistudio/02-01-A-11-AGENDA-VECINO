import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { logStructured, safeTraceId } from './runtime-security';

type Handler<TContext = unknown> = (
  request: NextRequest,
  context: TContext
) => Promise<NextResponse>;

export function withApiObservability<TContext = unknown>(name: string, handler: Handler<TContext>) {
  return async (request: NextRequest, context: TContext): Promise<NextResponse> => {
    const startedAt = Date.now();
    const traceId = safeTraceId(request.headers.get('x-trace-id'));

    try {
      const response = await handler(request, context);
      logStructured('api_request', {
        route: name,
        trace_id: traceId,
        status: response.status,
        duration_ms: Date.now() - startedAt
      });
      return response;
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag('route', name);
        scope.setTag('trace_id', traceId);
        scope.setContext('request', {
          method: request.method,
          path: request.nextUrl.pathname
        });
        Sentry.captureException(error);
      });

      logStructured('api_error', {
        route: name,
        trace_id: traceId,
        duration_ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown_error'
      });

      return NextResponse.json({ error: 'Internal server error', trace_id: traceId }, { status: 500 });
    }
  };
}
