import { NextResponse } from 'next/server';

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function handleRoute(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error: any) {
    const status = error?.status || 500;
    const message = status === 500 ? 'Server error' : error?.message || 'Request failed';
    console.error(error);
    return errorResponse(message, status);
  }
}
