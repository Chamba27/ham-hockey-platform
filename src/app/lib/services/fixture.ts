/**
 * src/app/lib/services/fixture.ts
 *
 * Persistence layer: bridges the pure domain engine (src/app/lib/engine/roundRobin.ts)
 * to the database via Prisma.
 */

import { prisma } from "../prisma";
import { generateRoundRobinFixtures } from "../engine/roundRobin";
import {
  evaluateGenerationGuard,
  validateResetConfirmation,
} from "../engine/fixtureGuard";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../errors";

export interface GenerateAndSaveOptions {
  doubleRoundRobin?: boolean;
}

/**
 * Fetches the teams registered to a competition, runs the pure round-robin
 * engine, and saves the resulting fixtures.
 */
export async function generateAndSaveFixturesForCompetition(
  competitionId: string,
  options?: GenerateAndSaveOptions
): Promise<{ count: number }> {
  // 1. Confirm the competition exists before doing any work.
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { id: true },
  });

  if (!competition) {
    throw new Error(`Competition not found: ${competitionId}`);
  }

  // 2. Load the team IDs registered to this competition via the join table.
  const competitionTeams = await prisma.competitionTeam.findMany({
    where: { competitionId },
    select: { teamId: true },
  });

  const teamIds = competitionTeams.map((ct) => ct.teamId);

  if (teamIds.length < 2) {
    throw new Error(
      `Competition ${competitionId} has ${teamIds.length} team(s) registered; ` +
        `at least 2 are required to generate fixtures.`
    );
  }

  // 3. Guard: check existing fixtures and results before overwriting
  const [fixtureCount, resultCount] = await Promise.all([
    prisma.fixture.count({ where: { competitionId } }),
    prisma.result.count({ where: { fixture: { competitionId } } }),
  ]);

  const guard = evaluateGenerationGuard({ fixtureCount, resultCount });
  if (!guard.allowed) {
    throw new ConflictError(
      `${guard.reason} To reset fixtures, send DELETE /api/competitions/${competitionId}/fixtures?confirm=RESET`
    );
  }

  // 4. Run the pure domain engine.
  const generatedFixtures = generateRoundRobinFixtures(teamIds, options);

  // 5. Persist: replace any existing schedule for this competition atomically.
  const { count } = await prisma.$transaction(async (tx) => {
    await tx.fixture.deleteMany({ where: { competitionId } });

    return tx.fixture.createMany({
      data: generatedFixtures.map((fixture) => ({
        competitionId,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        round: fixture.round,
      })),
    });
  });

  return { count };
}

/**
 * Wipes a competition's fixtures and their cascade-deleted results.
 * Requires explicit confirmation (`confirm === "RESET"`).
 */
export async function resetFixturesForCompetition(
  competitionId: string,
  confirm: unknown
): Promise<{
  competitionId: string;
  deletedFixtures: number;
  deletedResults: number;
}> {
  // 1. Look up competition first so an unknown ID returns NotFoundError (404)
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { id: true },
  });

  if (!competition) {
    throw new NotFoundError(`Competition not found: ${competitionId}`);
  }

  // 2. Count existing fixtures and results
  const [fixtureCount, resultCount] = await Promise.all([
    prisma.fixture.count({ where: { competitionId } }),
    prisma.result.count({ where: { fixture: { competitionId } } }),
  ]);

  // 3. Validate confirmation token with the engine
  const validation = validateResetConfirmation(confirm);
  if (!validation.isValid) {
    throw new ValidationError("Validation failed.", [
      ...validation.errors,
      `This action would delete ${fixtureCount} fixture(s) and ${resultCount} recorded result(s).`,
    ]);
  }

  // 4. Delete all fixtures inside a transaction (results cascade-delete via schema)
  await prisma.$transaction(async (tx) => {
    await tx.fixture.deleteMany({ where: { competitionId } });
  });

  return {
    competitionId,
    deletedFixtures: fixtureCount,
    deletedResults: resultCount,
  };
}