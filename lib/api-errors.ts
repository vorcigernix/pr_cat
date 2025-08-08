import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorResponse(error: unknown, fallbackMessage = 'Internal Server Error') {
  // Known ApiError type
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.statusCode }
    );
  }
  // Handle service errors that carry statusCode-like info
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'name' in error &&
    // @ts-expect-error runtime duck-typing
    (error.name === 'TeamServiceError' || typeof error.statusCode === 'number')
  ) {
    const anyErr = error as any;
    const status = typeof anyErr.statusCode === 'number' ? anyErr.statusCode : 500;
    return NextResponse.json(
      { error: String(anyErr.message || fallbackMessage), code: anyErr.code, details: anyErr.details },
      { status }
    );
  }
  if (error instanceof Error) {
    return NextResponse.json(
      { error: fallbackMessage, details: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json(
    { error: fallbackMessage },
    { status: 500 }
  );
}

export function badRequest(message: string, details?: unknown) {
  return new ApiError(400, message, details, 'BAD_REQUEST');
}

export function unauthorized(message = 'Unauthorized') {
  return new ApiError(401, message, undefined, 'UNAUTHORIZED');
}

export function forbidden(message = 'Forbidden') {
  return new ApiError(403, message, undefined, 'FORBIDDEN');
}

export function notFound(message = 'Not Found') {
  return new ApiError(404, message, undefined, 'NOT_FOUND');
}

export function conflict(message = 'Conflict', details?: unknown) {
  return new ApiError(409, message, details, 'CONFLICT');
}

