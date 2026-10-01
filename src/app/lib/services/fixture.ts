/**
 * src/app/lib/services/fixture.ts
 *
 * Persistence layer: bridges the pure domain engine (src/app/lib/engine/roundRobin.ts)
 * to the database via Prisma.
 */

import { prisma } from "../prisma";
import { generateRoundRobinFixtures } from "../engine/roundRobin";

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

  // 3. Run the pure domain engine.
  const generatedFixtures = generateRoundRobinFixtures(teamIds, options);

  // 4. Persist: replace any existing schedule for this competition atomically.
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