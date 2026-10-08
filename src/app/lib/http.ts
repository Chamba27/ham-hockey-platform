/**
 * src/app/lib/http.ts
 *
 * HTTP-layer response helpers for Next.js API routes.
 *
 * Bridges domain-layer errors to standard HTTP NextResponses so that
 * routes remain thin and the service/engine layers stay completely free
 * of Next.js / HTTP imports.
 */

import { NextResponse } from "next/server";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "./errors";

/**
 * Shared helper to map application errors to HTTP NextResponses uniformly.
 *
 * - ValidationError -> 400 Bad Request with details list
 * - NotFoundError   -> 404 Not Found
 * - ConflictError   -> 409 Conflict
 * - Unhandled/Other -> 500 Internal Server Error (logged for debugging)
 */
export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: "Validation failed.", details: error.details },
      { status: 400 }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: error.message },
      { status: 404 }
    );
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      { error: error.message },
      { status: 409 }
    );
  }

  // Any unexpected error is logged for server diagnostics and hidden from the client
  console.error("Unhandled API error:", error);
  return NextResponse.json(
    { error: "Something went wrong." },
    { status: 500 }
  );
}

