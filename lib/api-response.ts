import { NextResponse } from 'next/server';

type ErrorExtra = Record<string, unknown>;

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(message: string, status = 400, extra?: ErrorExtra) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

function getSafeServerErrorMessage(error: unknown) {
  const anyError = error as any;
  const message = String(anyError?.message || '');

  if (message.includes('JWT_SECRET')) {
    return 'Server configuration error: JWT_SECRET is missing or too short.';
  }

  if (
    message.includes('DATABASE_URL') ||
    anyError?.code === 'P1001' ||
    anyError?.code === 'P1012'
  ) {
    return 'Database configuration error: DATABASE_URL is missing or database is unreachable.';
  }

  if (
    anyError?.code === 'P2021' ||
    anyError?.code === 'P2022' ||
    message.toLowerCase().includes('table') ||
    message.toLowerCase().includes('column')
  ) {
    return 'Database schema error: run Prisma db push and seed on the Neon database.';
  }

  return 'Server error';
}

export async function handleRoute(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error: any) {
    console.error('API route error:', error);

    const status = error?.status || 500;

    if (status === 500) {
      return errorResponse(getSafeServerErrorMessage(error), 500);
    }

    return errorResponse(error?.message || 'Request failed', status);
  }
}
