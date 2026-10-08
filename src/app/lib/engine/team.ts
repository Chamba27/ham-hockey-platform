/**
 * src/app/lib/engine/team.ts
 *
 * Pure validation and normalization engine for Teams.
 *
 * Architecture rules:
 * - Domain-isolated: zero Prisma, zero Next.js, zero I/O or network calls.
 * - Pure functions only: takes an unknown input, returns normalized data or all validation errors.
 * - Returns all validation failures together in an array so callers get a complete report in one pass.
 */

export interface CreateTeamData {
  name: string;
  shortName: string;
}

export interface UpdateTeamData {
  name?: string;
  shortName?: string;
}

export type ValidationResult<T> =
  | { isValid: true; data: T; errors: [] }
  | { isValid: false; data: null; errors: string[] };

/**
 * Regex for valid short names:
 * 2 to 5 alphanumeric uppercase characters (e.g. GNC, SST, BHC1).
 */
const SHORT_NAME_REGEX = /^[A-Z0-9]{2,5}$/;

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;

/**
 * Validates and normalizes payload for creating a new Team.
 *
 * Requirements:
 * - Body must be a JSON object.
 * - No unknown keys outside of 'name' and 'shortName'.
 * - 'name': required string, trimmed, 2-80 characters.
 * - 'shortName': required string, trimmed, converted to uppercase, matches /^[A-Z0-9]{2,5}$/.
 */
export function validateCreateTeamInput(
  input: unknown
): ValidationResult<CreateTeamData> {
  const errors: string[] = [];

  // 1. Ensure the body is a non-null object and not an array
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      isValid: false,
      data: null,
      errors: ["Request body must be a valid JSON object."],
    };
  }

  const raw = input as Record<string, unknown>;

  // 2. Reject unexpected/unknown fields
  const allowedKeys = new Set(["name", "shortName"]);
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      errors.push(`Unknown field '${key}' is not allowed.`);
    }
  }

  // 3. Validate 'name'
  let normalizedName = "";
  if (!("name" in raw) || raw.name === undefined) {
    errors.push("Team name is required.");
  } else if (typeof raw.name !== "string") {
    errors.push("Team name must be a string.");
  } else {
    normalizedName = raw.name.trim();
    if (
      normalizedName.length < MIN_NAME_LENGTH ||
      normalizedName.length > MAX_NAME_LENGTH
    ) {
      errors.push(
        `Team name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`
      );
    }
  }

  // 4. Validate 'shortName'
  let normalizedShortName = "";
  if (!("shortName" in raw) || raw.shortName === undefined) {
    errors.push("Team shortName is required.");
  } else if (typeof raw.shortName !== "string") {
    errors.push("Team shortName must be a string.");
  } else {
    // Automatically normalize to uppercase after trimming
    normalizedShortName = raw.shortName.trim().toUpperCase();
    if (!SHORT_NAME_REGEX.test(normalizedShortName)) {
      errors.push(
        "Team shortName must be 2 to 5 alphanumeric characters (e.g. GNC, SST)."
      );
    }
  }

  if (errors.length > 0) {
    return { isValid: false, data: null, errors };
  }

  return {
    isValid: true,
    data: {
      name: normalizedName,
      shortName: normalizedShortName,
    },
    errors: [],
  };
}

/**
 * Validates and normalizes payload for updating an existing Team (PATCH).
 *
 * Requirements:
 * - Body must be a JSON object.
 * - At least one of 'name' or 'shortName' must be provided.
 * - No unknown keys outside of 'name' and 'shortName'.
 * - Any provided field follows the same validation rules as create.
 */
export function validateUpdateTeamInput(
  input: unknown
): ValidationResult<UpdateTeamData> {
  const errors: string[] = [];

  // 1. Ensure the body is a non-null object and not an array
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {
      isValid: false,
      data: null,
      errors: ["Request body must be a valid JSON object."],
    };
  }

  const raw = input as Record<string, unknown>;

  // 2. Reject unexpected/unknown fields
  const allowedKeys = new Set(["name", "shortName"]);
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      errors.push(`Unknown field '${key}' is not allowed.`);
    }
  }

  const hasName = "name" in raw && raw.name !== undefined;
  const hasShortName = "shortName" in raw && raw.shortName !== undefined;

  // 3. Ensure at least one field is provided for update
  if (!hasName && !hasShortName) {
    errors.push(
      "At least one field ('name' or 'shortName') must be provided for update."
    );
  }

  const data: UpdateTeamData = {};

  // 4. Validate 'name' if supplied
  if (hasName) {
    if (typeof raw.name !== "string") {
      errors.push("Team name must be a string.");
    } else {
      const trimmed = raw.name.trim();
      if (
        trimmed.length < MIN_NAME_LENGTH ||
        trimmed.length > MAX_NAME_LENGTH
      ) {
        errors.push(
          `Team name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`
        );
      } else {
        data.name = trimmed;
      }
    }
  }

  // 5. Validate 'shortName' if supplied
  if (hasShortName) {
    if (typeof raw.shortName !== "string") {
      errors.push("Team shortName must be a string.");
    } else {
      const normalizedShort = raw.shortName.trim().toUpperCase();
      if (!SHORT_NAME_REGEX.test(normalizedShort)) {
        errors.push(
          "Team shortName must be 2 to 5 alphanumeric characters (e.g. GNC, SST)."
        );
      } else {
        data.shortName = normalizedShort;
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, data: null, errors };
  }

  return {
    isValid: true,
    data,
    errors: [],
  };
}

