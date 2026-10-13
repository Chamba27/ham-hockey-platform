/**
 * src/app/lib/services/competition.ts
 *
 * Persistence and business logic layer for Competition management.
 *
 * Architecture rules:
 * - All Prisma database interactions for competitions live here.
 * - Delegates syntax and shape validation to the pure engine (src/app/lib/engine/competition.ts).
 * - Enforces business rules:
 *   1. Duplicate detection: name (case-insensitive) + season uniqueness. On PATCH, checks final combination.
 *   2. Competition deletion blocked if any fixtures exist.
 *   3. Team registration requires valid competition (404) and team (404), prevents duplicates (409).
 *   4. Team removal requires competition (404), registered membership (404), and is blocked if fixtures exist (409).
 * - Throws typed domain errors (ValidationError, NotFoundError, ConflictError) from src/app/lib/errors.ts.
 */

import { prisma } from "../prisma";
import {
  validateCreateCompetitionInput,
  validateUpdateCompetitionInput,
  validateRegisterTeamInput,
} from "../engine/competition";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../errors";

/**
 * Returns all competitions ordered by season descending, then name ascending.
 * Each entry includes teamCount and fixtureCount.
 */
export async function getAllCompetitions() {
  const competitions = await prisma.competition.findMany({
    orderBy: [
      { season: "desc" },
      { name: "asc" },
    ],
    include: {
      _count: {
        select: {
          teams: true,
          fixtures: true,
        },
      },
    },
  });

  return competitions.map((c) => ({
    id: c.id,
    name: c.name,
    season: c.season,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    teamCount: c._count.teams,
    fixtureCount: c._count.fixtures,
  }));
}

/**
 * Fetches a single competition by ID, including registered teams
 * ordered alphabetically by name, plus fixtureCount.
 */
export async function getCompetitionById(id: string) {
  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      teams: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              shortName: true,
            },
          },
        },
      },
      _count: {
        select: {
          fixtures: true,
        },
      },
    },
  });

  if (!competition) {
    throw new NotFoundError(`Competition with ID '${id}' not found.`);
  }

  // Extract team models and sort alphabetically by team name
  const teams = competition.teams
    .map((ct) => ct.team)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: competition.id,
    name: competition.name,
    season: competition.season,
    createdAt: competition.createdAt,
    updatedAt: competition.updatedAt,
    teams,
    fixtureCount: competition._count.fixtures,
  };
}

/**
 * Creates a new competition after engine validation and uniqueness checks.
 */
export async function createCompetition(input: unknown) {
  // 1. Pure validation & normalization
  const validation = validateCreateCompetitionInput(input);
  if (!validation.isValid) {
    throw new ValidationError("Validation failed.", validation.errors);
  }

  const { name, season } = validation.data;

  // 2. Business rule: duplicate check (name case-insensitive + same season)
  const existing = await prisma.competition.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      season,
    },
  });

  if (existing) {
    throw new ConflictError(
      `A competition with name '${name}' and season '${season}' already exists.`
    );
  }

  // 3. Persist to database
  return prisma.competition.create({
    data: {
      name,
      season,
    },
  });
}

/**
 * Updates an existing competition's name, season, or both.
 * Validates uniqueness on the resulting combination of name and season.
 */
export async function updateCompetition(id: string, input: unknown) {
  // 1. Pure validation & normalization
  const validation = validateUpdateCompetitionInput(input);
  if (!validation.isValid) {
    throw new ValidationError("Validation failed.", validation.errors);
  }

  // 2. Verify target competition exists
  const existing = await prisma.competition.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundError(`Competition with ID '${id}' not found.`);
  }

  // 3. Determine final name and season to verify combined uniqueness
  const finalName = validation.data.name ?? existing.name;
  const finalSeason = validation.data.season ?? existing.season;

  const conflict = await prisma.competition.findFirst({
    where: {
      id: { not: id },
      name: { equals: finalName, mode: "insensitive" },
      season: finalSeason,
    },
  });

  if (conflict) {
    throw new ConflictError(
      `A competition with name '${finalName}' and season '${finalSeason}' already exists.`
    );
  }

  // 4. Apply update
  return prisma.competition.update({
    where: { id },
    data: validation.data,
  });
}

/**
 * Deletes a competition by ID.
 * BLOCKED if any fixtures are associated with the competition.
 */
export async function deleteCompetition(id: string) {
  // 1. Fetch competition with fixture count
  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      _count: {
        select: { fixtures: true },
      },
    },
  });

  if (!competition) {
    throw new NotFoundError(`Competition with ID '${id}' not found.`);
  }

  // 2. Guard: block deletion if fixtures exist
  if (competition._count.fixtures > 0) {
    throw new ConflictError(
      `Cannot delete competition '${competition.name}': it has ${competition._count.fixtures} scheduled fixture(s). Reset fixtures first via DELETE /api/competitions/${id}/fixtures?confirm=RESET.`
    );
  }

  // 3. Delete competition (schema cascade-deletes competitionTeam records)
  await prisma.competition.delete({
    where: { id },
  });

  return { id };
}

/**
 * Registers a team into a competition.
 * Allowed even if fixtures already exist.
 */
export async function registerTeamForCompetition(
  competitionId: string,
  input: unknown
) {
  // 1. Pure validation
  const validation = validateRegisterTeamInput(input);
  if (!validation.isValid) {
    throw new ValidationError("Validation failed.", validation.errors);
  }

  const { teamId } = validation.data;

  // 2. Ensure competition exists (404)
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { id: true },
  });

  if (!competition) {
    throw new NotFoundError(`Competition with ID '${competitionId}' not found.`);
  }

  // 3. Ensure team exists (404)
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, shortName: true },
  });

  if (!team) {
    throw new NotFoundError(`Team with ID '${teamId}' not found.`);
  }

  // 4. Ensure team is not already registered in this competition (409)
  const existingRegistration = await prisma.competitionTeam.findUnique({
    where: {
      competitionId_teamId: {
        competitionId,
        teamId,
      },
    },
  });

  if (existingRegistration) {
    throw new ConflictError(
      `Team '${team.name}' is already registered in this competition.`
    );
  }

  // 5. Create join record
  await prisma.competitionTeam.create({
    data: {
      competitionId,
      teamId,
    },
  });

  return {
    competitionId,
    team,
  };
}

/**
 * Removes a team from a competition.
 * BLOCKED if the competition has any fixtures.
 */
export async function removeTeamFromCompetition(
  competitionId: string,
  teamId: string
) {
  // 1. Ensure competition exists (404) and inspect fixture count
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      _count: {
        select: { fixtures: true },
      },
    },
  });

  if (!competition) {
    throw new NotFoundError(`Competition with ID '${competitionId}' not found.`);
  }

  // 2. Ensure team is currently registered in this competition (404)
  const existingRegistration = await prisma.competitionTeam.findUnique({
    where: {
      competitionId_teamId: {
        competitionId,
        teamId,
      },
    },
  });

  if (!existingRegistration) {
    throw new NotFoundError(
      `Team with ID '${teamId}' is not registered in competition '${competitionId}'.`
    );
  }

  // 3. Guard: block removal if competition has any fixtures
  if (competition._count.fixtures > 0) {
    throw new ConflictError(
      `Cannot remove team from competition: competition already has ${competition._count.fixtures} scheduled fixture(s). Reset fixtures first via DELETE /api/competitions/${competitionId}/fixtures?confirm=RESET.`
    );
  }

  // 4. Delete registration
  await prisma.competitionTeam.delete({
    where: {
      competitionId_teamId: {
        competitionId,
        teamId,
      },
    },
  });

  return {
    competitionId,
    teamId,
  };
}

