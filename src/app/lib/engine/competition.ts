/**
 * src/app/lib/engine/competition.ts
 *
 * Pure validation and normalization engine for Competitions.
 *
 * Architecture rules:
 * - Domain-isolated: zero Prisma, zero Next.js, zero I/O or network calls.
 * - Pure functions only: takes an unknown input, returns normalized data or all validation errors.
 * - Collects and returns all validation failures together in an array.
 */

export interface CreateCompetitionData {
  name: string;
  season: string;
}

export interface UpdateCompetitionData {
  name?: string;
  season?: string;
}

export interface RegisterTeamData {
  teamId: string;
}

export type ValidationResult<T> =
  | { isValid: true; data: T; errors: [] }
  | { isValid: false; data: null; errors: string[] };

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;

/**
 * Regex for valid season:
 * 4-digit year, optionally followed by / and another 4-digit year.
 * Examples: "2026", "2026/2027".
 */
const SEASON_REGEX = /^\d{4}(\/\d{4})?$/;

/**
 * Validates and normalizes payload for creating a new Competition.
 *
 * Requirements:
 * - Body must be a JSON object (rejects arrays, null, primitives).
 * - No unknown keys outside of 'name' and 'season'.
 * - 'name': required string, trimmed, 2-80 characters.
 * - 'season': required string, trimmed, matching /^\d{4}(\/\d{4})?$/.
 */
export function validateCreateCompetitionInput(
  input: unknown
): ValidationResult<CreateCompetitionData> {
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
  const allowedKeys = new Set(["name", "season"]);
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      errors.push(`Unknown field '${key}' is not allowed.`);
    }
  }

  // 3. Validate 'name'
  let normalizedName = "";
  if (!("name" in raw) || raw.name === undefined) {
    errors.push("Competition name is required.");
  } else if (typeof raw.name !== "string") {
    errors.push("Competition name must be a string.");
  } else {
    normalizedName = raw.name.trim();
    if (
      normalizedName.length < MIN_NAME_LENGTH ||
      normalizedName.length > MAX_NAME_LENGTH
    ) {
      errors.push(
        `Competition name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`
      );
    }
  }

  // 4. Validate 'season'
  let normalizedSeason = "";
  if (!("season" in raw) || raw.season === undefined) {
    errors.push("Competition season is required.");
  } else if (typeof raw.season !== "string") {
    errors.push("Competition season must be a string.");
  } else {
    normalizedSeason = raw.season.trim();
    if (!SEASON_REGEX.test(normalizedSeason)) {
      errors.push(
        "Competition season must be a 4-digit year or year range (e.g. '2026' or '2026/2027')."
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
      season: normalizedSeason,
    },
    errors: [],
  };
}

/**
 * Validates and normalizes payload for updating an existing Competition (PATCH).
 *
 * Requirements:
 * - Body must be a JSON object (rejects arrays, null, primitives).
 * - At least one of 'name' or 'season' must be provided.
 * - No unknown keys outside of 'name' and 'season'.
 * - Any provided field follows the same validation rules as create.
 */
export function validateUpdateCompetitionInput(
  input: unknown
): ValidationResult<UpdateCompetitionData> {
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
  const allowedKeys = new Set(["name", "season"]);
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      errors.push(`Unknown field '${key}' is not allowed.`);
    }
  }

  const hasName = "name" in raw && raw.name !== undefined;
  const hasSeason = "season" in raw && raw.season !== undefined;

  // 3. Ensure at least one field is provided for update
  if (!hasName && !hasSeason) {
    errors.push(
      "At least one field ('name' or 'season') must be provided for update."
    );
  }

  const data: UpdateCompetitionData = {};

  // 4. Validate 'name' if supplied
  if (hasName) {
    if (typeof raw.name !== "string") {
      errors.push("Competition name must be a string.");
    } else {
      const trimmed = raw.name.trim();
      if (
        trimmed.length < MIN_NAME_LENGTH ||
        trimmed.length > MAX_NAME_LENGTH
      ) {
        errors.push(
          `Competition name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`
        );
      } else {
        data.name = trimmed;
      }
    }
  }

  // 5. Validate 'season' if supplied
  if (hasSeason) {
    if (typeof raw.season !== "string") {
      errors.push("Competition season must be a string.");
    } else {
      const trimmed = raw.season.trim();
      if (!SEASON_REGEX.test(trimmed)) {
        errors.push(
          "Competition season must be a 4-digit year or year range (e.g. '2026' or '2026/2027')."
        );
      } else {
        data.season = trimmed;
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

/**
 * Validates and normalizes payload for registering a team in a competition.
 *
 * Requirements:
 * - Body must be a JSON object (rejects arrays, null, primitives).
 * - No unknown keys outside of 'teamId'.
 * - 'teamId': required non-empty string after trimming.
 */
export function validateRegisterTeamInput(
  input: unknown
): ValidationResult<RegisterTeamData> {
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
  const allowedKeys = new Set(["teamId"]);
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) {
      errors.push(`Unknown field '${key}' is not allowed.`);
    }
  }

  // 3. Validate 'teamId'
  let normalizedTeamId = "";
  if (!("teamId" in raw) || raw.teamId === undefined) {
    errors.push("teamId is required.");
  } else if (typeof raw.teamId !== "string") {
    errors.push("teamId must be a string.");
  } else {
    normalizedTeamId = raw.teamId.trim();
    if (normalizedTeamId.length === 0) {
      errors.push("teamId must not be empty.");
    }
  }

  if (errors.length > 0) {
    return { isValid: false, data: null, errors };
  }

  return {
    isValid: true,
    data: {
      teamId: normalizedTeamId,
    },
    errors: [],
  };
}

