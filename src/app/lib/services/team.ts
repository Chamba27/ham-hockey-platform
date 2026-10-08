/**
 * src/app/lib/services/team.ts
 *
 * Persistence and business logic layer for Team management.
 *
 * Architecture rules:
 * - All Prisma database interactions for teams live here.
 * - Delegates all syntax/type validation to the pure engine (src/app/lib/engine/team.ts).
 * - Enforces business rules:
 *   1. Case-insensitive uniqueness for both name and shortName.
 *   2. Conflict protection: updates do not conflict with self, but cannot collide with other teams.
 *   3. Safe deletion: explicitly blocks deletion if a team is linked to any competition or fixture,
 *      giving human-friendly error messages before hitting foreign key database errors.
 * - Throws typed domain errors (ValidationError, NotFoundError, ConflictError) from src/app/lib/errors.ts.
 */

import { prisma } from "../prisma";
import {
  validateCreateTeamInput,
  validateUpdateTeamInput,
} from "../engine/team";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../errors";

/**
 * Returns all teams in the system ordered alphabetically by name ascending.
 */
export async function getAllTeams() {
  return prisma.team.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

/**
 * Fetches a single team by its ID.
 * Throws NotFoundError if the team does not exist.
 */
export async function getTeamById(id: string) {
  const team = await prisma.team.findUnique({
    where: { id },
  });

  if (!team) {
    throw new NotFoundError(`Team with ID '${id}' not found.`);
  }

  return team;
}

/**
 * Creates a new team after engine validation and case-insensitive uniqueness checks.
 */
export async function createTeam(input: unknown) {
  // 1. Pure validation & normalization
  const validation = validateCreateTeamInput(input);
  if (!validation.isValid) {
    throw new ValidationError("Validation failed.", validation.errors);
  }

  const { name, shortName } = validation.data;

  // 2. Business rule: team name must be unique (case-insensitive)
  const existingByName = await prisma.team.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existingByName) {
    throw new ConflictError(`A team with name '${name}' already exists.`);
  }

  // 3. Business rule: shortName must be unique (case-insensitive)
  const existingByShortName = await prisma.team.findFirst({
    where: {
      shortName: { equals: shortName, mode: "insensitive" },
    },
  });

  if (existingByShortName) {
    throw new ConflictError(
      `A team with shortName '${shortName}' already exists.`
    );
  }

  // 4. Persist to database
  return prisma.team.create({
    data: {
      name,
      shortName,
    },
  });
}

/**
 * Updates an existing team's name, shortName, or both.
 * Ensures the team exists and does not conflict with existing records.
 */
export async function updateTeam(id: string, input: unknown) {
  // 1. Pure validation & normalization
  const validation = validateUpdateTeamInput(input);
  if (!validation.isValid) {
    throw new ValidationError("Validation failed.", validation.errors);
  }

  // 2. Verify target team exists
  const existingTeam = await prisma.team.findUnique({
    where: { id },
  });

  if (!existingTeam) {
    throw new NotFoundError(`Team with ID '${id}' not found.`);
  }

  const { name, shortName } = validation.data;

  // 3. Business rule: name uniqueness excluding the current team
  if (name !== undefined) {
    const nameConflict = await prisma.team.findFirst({
      where: {
        id: { not: id },
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (nameConflict) {
      throw new ConflictError(`A team with name '${name}' already exists.`);
    }
  }

  // 4. Business rule: shortName uniqueness excluding the current team
  if (shortName !== undefined) {
    const shortNameConflict = await prisma.team.findFirst({
      where: {
        id: { not: id },
        shortName: { equals: shortName, mode: "insensitive" },
      },
    });

    if (shortNameConflict) {
      throw new ConflictError(
        `A team with shortName '${shortName}' already exists.`
      );
    }
  }

  // 5. Apply the update
  return prisma.team.update({
    where: { id },
    data: validation.data,
  });
}

/**
 * Deletes a team by ID.
 *
 * Explicitly guards against deleting teams that are referenced by:
 * - competitions (CompetitionTeam records)
 * - home fixtures or away fixtures
 *
 * This prevents accidental schedule disruption and provides descriptive feedback.
 */
export async function deleteTeam(id: string) {
  // 1. Fetch team with reference counts
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          competitions: true,
          homeFixtures: true,
          awayFixtures: true,
        },
      },
    },
  });

  if (!team) {
    throw new NotFoundError(`Team with ID '${id}' not found.`);
  }

  // 2. Guard: check competition participation
  if (team._count.competitions > 0) {
    throw new ConflictError(
      `Cannot delete team '${team.name}': it is registered in ${team._count.competitions} competition(s). Remove it from all competitions first.`
    );
  }

  // 3. Guard: check fixture participation (home or away)
  const totalFixtures = team._count.homeFixtures + team._count.awayFixtures;
  if (totalFixtures > 0) {
    throw new ConflictError(
      `Cannot delete team '${team.name}': it is scheduled in ${totalFixtures} fixture(s). Remove or reassign its fixtures first.`
    );
  }

  // 4. Safe to delete
  await prisma.team.delete({
    where: { id },
  });

  return { id };
}

