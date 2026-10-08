/**
 * src/app/lib/errors.ts
 *
 * Custom application error classes for domain and service operations.
 *
 * Why this exists:
 * The service layer should not know about HTTP concepts (status codes, headers,
 * NextResponse). By throwing typed domain errors instead, the service stays pure
 * and reusable (e.g. in CLI scripts or background jobs), while API routes can
 * inspect the error type and map it to the correct HTTP response.
 */

/**
 * Thrown when user-provided data fails engine validation rules.
 * Carries an array of specific error messages so the client can fix all issues at once.
 */
export class ValidationError extends Error {
  public readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

/**
 * Thrown when a requested resource (e.g. a Team by ID) does not exist in the database.
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when an operation violates a business rule or unique constraint
 * (e.g. duplicate team name, or attempting to delete a team with scheduled fixtures).
 */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
