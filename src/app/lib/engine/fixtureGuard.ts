/**
 * src/app/lib/engine/fixtureGuard.ts
 *
 * Pure logic engine for fixture generation guards and reset confirmations.
 *
 * Architecture rules:
 * - Domain-isolated: zero Prisma, zero Next.js, zero I/O.
 * - Pure functions only.
 */

export interface GenerationGuardInput {
  fixtureCount: number;
  resultCount: number;
}

export type GenerationGuardResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export type ValidationResult<T> =
  | { isValid: true; data: T; errors: [] }
  | { isValid: false; data: null; errors: string[] };

/**
 * Evaluates whether fixtures can be generated for a competition.
 *
 * Generating fixtures is allowed only when no match results are recorded
 * (resultCount === 0). When any results exist, generation is blocked to prevent
 * accidental loss of recorded match scores, and the fixtures must be reset first.
 */
export function evaluateGenerationGuard(
  input: GenerationGuardInput
): GenerationGuardResult {
  if (input.resultCount === 0) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Cannot generate fixtures: ${input.resultCount} match result(s) are recorded. Fixtures must be reset first.`,
  };
}

/**
 * Validates the confirmation token required to reset fixtures.
 *
 * The only valid value is the exact string "RESET" (case-sensitive, no trimming).
 * Rejects null, missing, non-strings, and any other value with clear messages.
 */
export function validateResetConfirmation(
  input: unknown
): ValidationResult<"RESET"> {
  const errors: string[] = [];

  if (input === undefined) {
    errors.push("Confirmation is required.");
  } else if (input === null) {
    errors.push("Confirmation must not be null.");
  } else if (typeof input !== "string") {
    errors.push("Confirmation must be a string.");
  } else if (input !== "RESET") {
    errors.push("Confirmation must be the exact string 'RESET'.");
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      data: null,
      errors,
    };
  }

  return {
    isValid: true,
    data: "RESET",
    errors: [],
  };
}

